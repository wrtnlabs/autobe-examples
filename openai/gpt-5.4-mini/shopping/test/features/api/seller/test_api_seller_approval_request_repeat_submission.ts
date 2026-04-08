import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequest";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_mall_platform_seller_approval_requests_create } from "../../../generate/generate_random_mall_platform_seller_approval_requests_create";
import { prepare_random_mall_platform_administrator_approval_request } from "../../../prepare/prepare_random_mall_platform_administrator_approval_request";

export async function test_api_seller_approval_request_repeat_submission(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify seller repeat submission behavior for administrator approval requests.
   *
   * This test exercises the governance workflow for a seller account that submits an administrator approval request more than once. It validates that the platform either creates a separate pending record for the second submission or rejects the repeat attempt without mutating the original request.
   *
   * 1. Create an isolated seller connection and authenticate a seller account.
   * 2. Submit the first administrator approval request and preserve its persisted state.
   * 3. Attempt a second submission with a different reason.
   * 4. Validate that the first request remains unchanged and, if a second request is accepted, that it is a distinct pending record.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(sellerAuth);
  const firstReason = RandomGenerator.paragraph({ sentences: 3 });
  const firstRequest =
    await api.functional.mallPlatform.seller.approvalRequests.create(
      sellerConnection,
      {
        body: {
          reason: firstReason,
        } satisfies IMallPlatformAdministratorApprovalRequest.ICreate,
      },
    );
  typia.assert(firstRequest);
  TestValidator.equals(
    "first request reason should be preserved",
    firstRequest.reason,
    firstReason,
  );
  TestValidator.equals(
    "first request status should be pending",
    firstRequest.status,
    "pending",
  );
  TestValidator.equals(
    "first request rejection reason should be null",
    firstRequest.rejectionReason,
    null,
  );
  TestValidator.equals(
    "first request reviewer should be null",
    firstRequest.reviewerAdministrator,
    null,
  );
  TestValidator.equals(
    "first request reviewedAt should be null",
    firstRequest.reviewedAt,
    null,
  );
  const secondReason = RandomGenerator.paragraph({ sentences: 4 });
  const secondResult = await TestValidator.error(
    "repeat submission may be rejected by business rules",
    async () => {
      return await api.functional.mallPlatform.seller.approvalRequests.create(
        sellerConnection,
        {
          body: {
            reason: secondReason,
          } satisfies IMallPlatformAdministratorApprovalRequest.ICreate,
        },
      );
    },
  );
  if (secondResult === undefined) {
    TestValidator.equals(
      "original request should remain pending after blocked repeat submission",
      firstRequest.status,
      "pending",
    );
    TestValidator.equals(
      "original request reason should remain unchanged after blocked repeat submission",
      firstRequest.reason,
      firstReason,
    );
    return;
  }
  const secondRequest = secondResult as IMallPlatformAdministratorApprovalRequest;
  TestValidator.notEquals(
    "repeat submission should create a separate request id",
    secondRequest.id,
    firstRequest.id,
  );
  TestValidator.equals(
    "second request reason should match latest submission",
    secondRequest.reason,
    secondReason,
  );
  TestValidator.equals(
    "second request status should be pending",
    secondRequest.status,
    "pending",
  );
  TestValidator.equals(
    "second request rejection reason should be null",
    secondRequest.rejectionReason,
    null,
  );
  TestValidator.equals(
    "second request reviewer should be null",
    secondRequest.reviewerAdministrator,
    null,
  );
  TestValidator.equals(
    "second request reviewedAt should be null",
    secondRequest.reviewedAt,
    null,
  );
  TestValidator.equals(
    "original request should remain pending",
    firstRequest.status,
    "pending",
  );
  TestValidator.equals(
    "original request reason should remain unchanged",
    firstRequest.reason,
    firstReason,
  );
}
