import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrderRefund";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformOrderRefund";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_order_refund_retrieval_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate member by joining
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberJoinData = {
    email: memberEmail,
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/join",
    referrer: "https://example.com/home",
  } satisfies ICommunityPlatformMember.IJoin;
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, { body: memberJoinData });
  typia.assert(member);
  // Step 2: Generate a random orderId (UUID) to test refund retrieval against
  const orderId: string = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Retrieve refund requests for the order using authenticated member connection
  const refundsPage: IPageICommunityPlatformOrderRefund =
    await api.functional.communityPlatform.member.orders.refunds.index(
      memberConnection,
      { orderId },
    );
  typia.assert(refundsPage);
  // Step 4: Validate pagination structure according to IPage.IPagination schema
  // These properties are defined by the system, so we validate their types and non-negative constraints
  TestValidator.predicate(
    "pagination current page is non-negative",
    refundsPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    refundsPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    refundsPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    refundsPage.pagination.pages >= 0,
  );
  // Step 5: Validate data array contains only ICommunityPlatformOrderRefund objects
  // Each refund item must conform to ICommunityPlatformOrderRefund schema
  for (const refund of refundsPage.data) {
    TestValidator.predicate(
      "refund status is valid",
      ["pending", "approved", "rejected"].includes(refund.status),
    );
    TestValidator.predicate(
      "refund amount is positive and non-zero",
      refund.amount >= 0.01,
    );
    TestValidator.predicate(
      "refund method is valid",
      ["original_payment", "store_credit", "another_card"].includes(
        refund.refundMethod,
      ),
    );
    TestValidator.predicate(
      "refund originalTransactionId length <= 255",
      refund.originalTransactionId.length <= 255,
    );
    TestValidator.predicate(
      "refund receiptNumber length <= 50",
      refund.receiptNumber.length <= 50,
    );
    TestValidator.predicate(
      "refund refundReasonCode length <= 100",
      refund.refundReasonCode.length <= 100,
    );
    // Check that notes are either undefined or within maxLength
    if (refund.notes !== undefined) {
      TestValidator.predicate(
        "refund notes length <= 5000",
        refund.notes.length <= 5000,
      );
    }
  }
  // Step 6: Verify that a different member cannot access the same order's refunds
  // Authenticate a second, different member
  const otherMemberConnection: api.IConnection = { host: connection.host };
  const otherMemberEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const otherMemberJoinData = {
    email: otherMemberEmail,
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/join",
    referrer: "https://example.com/home",
  } satisfies ICommunityPlatformMember.IJoin;
  const otherMember: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(otherMemberConnection, {
      body: otherMemberJoinData,
    });
  typia.assert(otherMember);
  // Attempt to retrieve refunds for the original order using the other member's connection
  // This should fail with an authorization error
  await TestValidator.error(
    "other member cannot access refund records for different order",
    async () => {
      await api.functional.communityPlatform.member.orders.refunds.index(
        otherMemberConnection,
        { orderId },
      );
    },
  );
  // Note: This test works even if the order has no refunds.
  // The authorization restriction is the key point: member can only retrieve refunds for their own orders.
  // We cannot test the content of refunds because we cannot create them (no API or generation function).
  // But we can verify the structure, pagination, and authorization enforcement.
}
