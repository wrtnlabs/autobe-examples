import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_refund_requests_create } from "../../../generate/generate_random_shopping_mall_member_refund_requests_create";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";

export async function test_api_refund_requests_create_workflow_initialization_and_eligibility(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
    } satisfies IShoppingMallMember.IJoin,
  });
  // Scenario 1: Eligible delivered order item -> successful initialization
  const customerReason1 = RandomGenerator.paragraph({ sentences: 2 });
  const refundRequest1 =
    await generate_random_shopping_mall_member_refund_requests_create(
      memberConnection,
      {
        body: {
          customerReason: customerReason1,
        },
      },
    );
  typia.assert(refundRequest1);
  TestValidator.equals(
    "sellerComment should be null",
    refundRequest1.sellerComment,
    null,
  );
  TestValidator.equals(
    "decisionedAt should be null",
    refundRequest1.decisionedAt,
    null,
  );
  TestValidator.equals(
    "deletedAt should be null",
    refundRequest1.deletedAt,
    null,
  );
  TestValidator.equals(
    "customerReason matches",
    refundRequest1.customerReason,
    customerReason1,
  );
  const createdAtMs = new Date(refundRequest1.createdAt).getTime();
  const updatedAtMs = new Date(refundRequest1.updatedAt).getTime();
  TestValidator.predicate(
    "updatedAt should be >= createdAt",
    updatedAtMs >= createdAtMs,
  );
  // Scenario 2: Outside eligibility window -> business rejection.
  // Without explicit order-item preparation endpoints, use a random UUID that is
  // unlikely to be an owned/eligible delivered item.
  const tooOldReason = RandomGenerator.paragraph({ sentences: 2 });
  await TestValidator.error(
    "refund request should be rejected when order item is not eligible",
    async () => {
      await generate_random_shopping_mall_member_refund_requests_create(
        memberConnection,
        {
          body: {
            orderItemId: typia.random<string & tags.Format<"uuid">>(),
            customerReason: tooOldReason,
          },
        },
      );
    },
  );
  // Scenario 3: Soft-deleted order item -> business rejection.
  // Again, without soft-delete preparation endpoints, use a random UUID.
  const deletedReason = RandomGenerator.paragraph({ sentences: 2 });
  await TestValidator.error(
    "refund request should be rejected when order item is soft-deleted or not accessible",
    async () => {
      await generate_random_shopping_mall_member_refund_requests_create(
        memberConnection,
        {
          body: {
            orderItemId: typia.random<string & tags.Format<"uuid">>(),
            customerReason: deletedReason,
          },
        },
      );
    },
  );
}
