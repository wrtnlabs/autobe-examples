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

/**
 * Rejects seller administrator approval request creation for an ineligible account.
 *
 * Validates that a signed-in seller account cannot create an administrator approval request when the account is not eligible for governance access. The test covers the business-rule failure path rather than request-body validation, and it ensures the failed attempt does not alter the seller's existing account state.
 *
 * 1. Register a seller account and capture its initial approval status.
 * 2. Attempt to submit an administrator approval request from the seller context.
 * 3. Verify that the request is rejected and that the seller account state is unchanged.
 */
export async function test_api_seller_approval_request_ineligible_account(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234!",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const beforeStatus = seller.status;
  const beforeRejectionReason = seller.rejectionReason;
  await TestValidator.error(
    "ineligible seller cannot create administrator approval request",
    async () => {
      await api.functional.mallPlatform.seller.approvalRequests.create(
        sellerConnection,
        {
          body: {
            reason: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IMallPlatformAdministratorApprovalRequest.ICreate,
        },
      );
    },
  );
  TestValidator.equals(
    "seller status remains unchanged",
    seller.status,
    beforeStatus,
  );
  TestValidator.equals(
    "seller rejection reason remains unchanged",
    seller.rejectionReason,
    beforeRejectionReason,
  );
}
