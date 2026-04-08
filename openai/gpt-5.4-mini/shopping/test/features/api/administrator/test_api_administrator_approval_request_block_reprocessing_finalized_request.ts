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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_mall_platform_seller_approval_requests_create } from "../../../generate/generate_random_mall_platform_seller_approval_requests_create";
import { prepare_random_mall_platform_administrator_approval_request } from "../../../prepare/prepare_random_mall_platform_administrator_approval_request";

/**
 * Test that a finalized administrator approval request cannot be processed again.
 *
 * This scenario verifies the governance workflow for administrator approval requests by creating a pending request, finalizing it once, and then confirming that a second decision cannot overwrite the stored final state.
 *
 * The test checks the business rule that finalized requests are immutable with respect to reprocessing, while the persisted reviewer metadata and review timestamp remain stable after the first successful decision.
 *
 * 1. Create a seller account and submit an administrator approval request.
 * 2. Authenticate as an administrator and finalize the request once.
 * 3. Attempt to process the same request again with a different decision.
 * 4. Verify the second attempt is rejected and the finalized response remains unchanged.
 */
export async function test_api_administrator_approval_request_block_reprocessing_finalized_request(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await api.functional.mallPlatform.auth.seller.join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IMallPlatformSeller.IJoin,
  });
  const approvalRequest =
    await generate_random_mall_platform_seller_approval_requests_create(
      sellerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(approvalRequest);
  const administratorConnection: api.IConnection = { host: connection.host };
  await api.functional.mallPlatform.auth.administrator.join(
    administratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IMallPlatformAdministrator.IJoin,
    },
  );
  const finalized =
    await api.functional.mallPlatform.administrator.approval_requests.update(
      administratorConnection,
      {
        approvalRequestId: approvalRequest.id,
        body: {
          status: "approved",
        } satisfies IMallPlatformAdministratorApprovalRequest.IUpdate,
      },
    );
  typia.assert(finalized);
  await TestValidator.error(
    "should reject reprocessing a finalized administrator approval request",
    async () => {
      await api.functional.mallPlatform.administrator.approval_requests.update(
        administratorConnection,
        {
          approvalRequestId: approvalRequest.id,
          body: {
            status: "rejected",
            rejectionReason: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IMallPlatformAdministratorApprovalRequest.IUpdate,
        },
      );
    },
  );
  TestValidator.equals(
    "approval request id should remain the same",
    finalized.id,
    approvalRequest.id,
  );
  TestValidator.equals(
    "approval request status should remain approved",
    finalized.status,
    "approved",
  );
  TestValidator.predicate(
    "reviewedAt should be recorded",
    finalized.reviewedAt !== null,
  );
  TestValidator.equals(
    "rejectionReason should remain null after approval",
    finalized.rejectionReason,
    null,
  );
  TestValidator.predicate(
    "reviewer administrator should be recorded",
    finalized.reviewerAdministrator !== null,
  );
}
