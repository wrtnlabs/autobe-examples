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

export async function test_api_seller_approval_request_create_pending(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify that an authenticated seller can submit an administrator approval request.
   *
   * This test covers the seller governance onboarding flow by creating a fresh seller
   * session, submitting an approval request, and checking that the created request is
   * stored in the pending state with the seller bound as the applicant.
   *
   * 1. Register a new seller account and obtain an authenticated seller connection.
   * 2. Submit an administrator approval request with a valid reason.
   * 3. Validate the request reason, pending status, applicant linkage, and the absence
   *    of reviewer or rejection metadata.
   */
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
    await generate_random_mall_platform_seller_approval_requests_create(
      sellerConnection,
      {
        body: {
          reason,
        } satisfies IMallPlatformAdministratorApprovalRequest.ICreate,
      },
    );
  typia.assert(request);
  TestValidator.equals("request reason", request.reason, reason);
  TestValidator.equals("request status", request.status, "pending");
  TestValidator.equals(
    "request applicant id",
    request.administrator.id,
    seller.id,
  );
  TestValidator.equals("request reviewer", request.reviewerAdministrator, null);
  TestValidator.equals(
    "request rejection reason",
    request.rejectionReason,
    null,
  );
  TestValidator.equals("request reviewed at", request.reviewedAt, null);
}
