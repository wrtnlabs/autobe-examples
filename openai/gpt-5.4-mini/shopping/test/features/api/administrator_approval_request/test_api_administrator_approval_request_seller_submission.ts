import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequest";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_mall_platform_customer_administrator_approval_requests_create } from "../../../generate/generate_random_mall_platform_customer_administrator_approval_requests_create";
import { prepare_random_mall_platform_administrator_approval_request } from "../../../prepare/prepare_random_mall_platform_administrator_approval_request";

/**
 * Verifies that a seller can submit an administrator approval request and that the request is stored against the seller applicant.
 *
 * This test covers the governance submission flow for seller-authenticated users who are eligible to request administrator access. It validates that the created request preserves the submitted reason, starts in pending status, and remains unassigned to a reviewer immediately after creation.
 *
 * The scenario also ensures the request is linked to the authenticated seller session rather than a customer session, which is important because the endpoint is shared under the customer namespace but must still resolve the applicant from the seller authentication context.
 *
 * 1. Authenticate a fresh seller account using the seller join flow.
 * 2. Submit an administrator approval request with a valid reason through the shared request endpoint.
 * 3. Verify the response records the seller as the applicant, preserves the reason, and returns a pending request with no reviewer yet.
 */
export async function test_api_administrator_approval_request_seller_submission(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const requestReason = RandomGenerator.paragraph({ sentences: 2 });
  const request =
    await generate_random_mall_platform_customer_administrator_approval_requests_create(
      sellerConnection,
      {
        body: {
          reason: requestReason,
        } satisfies IMallPlatformAdministratorApprovalRequest.ICreate,
      },
    );
  typia.assert(request);
  TestValidator.equals(
    "request reason should be preserved",
    request.reason,
    requestReason,
  );
  TestValidator.equals("request should be pending", request.status, "pending");
  TestValidator.equals(
    "applicant should be the authenticated seller",
    request.administrator.email,
    seller.email,
  );
  TestValidator.predicate(
    "request should not have reviewer yet",
    request.reviewerAdministrator === null,
  );
}
