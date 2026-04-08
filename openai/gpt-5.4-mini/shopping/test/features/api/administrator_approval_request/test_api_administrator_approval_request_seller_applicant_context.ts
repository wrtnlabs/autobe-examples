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
import { generate_random_mall_platform_seller_administrator_approval_requests_create } from "../../../generate/generate_random_mall_platform_seller_administrator_approval_requests_create";
import { prepare_random_mall_platform_administrator_approval_request } from "../../../prepare/prepare_random_mall_platform_administrator_approval_request";

/**
 * Verify seller applicant context is preserved when submitting an administrator approval request.
 *
 * This scenario validates the governance request flow for a seller-authenticated session by creating a fresh seller account, submitting an administrator approval request with a specific reason, and confirming that the created record reflects the seller as the applicant.
 *
 * The test also verifies that the submitted reason is stored verbatim and that the request is initially created in a pending, unreviewed state with no reviewer or rejection information populated.
 *
 * 1. Create an authenticated seller session using the seller join utility.
 * 2. Submit an administrator approval request from that seller session.
 * 3. Validate the returned request preserves the applicant context and pending lifecycle state.
 */
export async function test_api_administrator_approval_request_seller_applicant_context(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const reason = RandomGenerator.paragraph({ sentences: 3 });
  const request =
    await generate_random_mall_platform_seller_administrator_approval_requests_create(
      sellerConnection,
      {
        body: {
          reason,
        } satisfies IMallPlatformAdministratorApprovalRequest.ICreate,
      },
    );
  typia.assert(request);
  TestValidator.equals(
    "request reason should be stored verbatim",
    request.reason,
    reason,
  );
  TestValidator.equals(
    "request should start pending",
    request.status,
    "pending",
  );
  TestValidator.equals(
    "request should have no reviewer yet",
    request.reviewerAdministrator,
    null,
  );
  TestValidator.equals(
    "request should have no rejection reason yet",
    request.rejectionReason,
    null,
  );
  TestValidator.equals(
    "request should not be reviewed yet",
    request.reviewedAt,
    null,
  );
  TestValidator.equals(
    "request applicant email should match the seller session",
    request.administrator.email,
    seller.email,
  );
  TestValidator.equals(
    "request applicant id should match the seller account",
    request.administrator.id,
    seller.id,
  );
}
