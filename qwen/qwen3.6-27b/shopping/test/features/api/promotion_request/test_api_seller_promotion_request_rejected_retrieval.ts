import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformAdministratorPromotionRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdministratorPromotionRequestOfCustomer";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_platform_seller_administrator_promotion_requests_create } from "../../../generate/generate_random_ecommerce_platform_seller_administrator_promotion_requests_create";
import { prepare_random_ecommerce_platform_administrator_promotion_request_of_customer } from "../../../prepare/prepare_random_ecommerce_platform_administrator_promotion_request_of_customer";

/**
 * Test seller retrieval of administrator promotion request after rejection by super administrator.
 *
 * Validates that a seller can retrieve their promotion request details showing the rejected status,
 * rejection reason, super administrator who reviewed it, and the review timestamp. Also ensures
 * the original reason submitted by the seller is preserved in the response.
 *
 * 1. Seller joins the platform with a promotion request for administrator privileges
 * 2. A super administrator joins the platform to gain authority to reject requests
 * 3. The super administrator rejects the seller's promotion request with a rejection reason
 * 4. The seller retrieves the full promotion request details showing the rejected status
 * 5. Validates the status, rejectionReason, reviewedByAdmin, and reviewedAt
 */
export async function test_api_seller_promotion_request_rejected_retrieval(
  connection: api.IConnection,
) {
  // 1. Seller joins the platform and submits a promotion request
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoined: IEcommercePlatformSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password1234",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommercePlatformSeller.IJoin,
    });
  typia.assert<IEcommercePlatformSeller.IAuthorized>(sellerJoined);
  // 2. Admin (super administrator) joins the platform
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoined: IEcommercePlatformAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password1234",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommercePlatformAdmin.IJoin,
    });
  typia.assert<IEcommercePlatformAdmin.IAuthorized>(adminJoined);
  // 3. Seller creates an administrator promotion request
  const requestBody: IEcommercePlatformAdministratorPromotionRequestOfCustomer.ICreate =
    {
      actorType: "seller",
      reason:
        "I have extensive experience and should be promoted to administrator to help manage the platform.",
    };
  const promotionRequest: IEcommercePlatformAdministratorPromotionRequestOfCustomer =
    await api.functional.ecommercePlatform.seller.administrator_promotion_requests.create(
      sellerConnection,
      { body: requestBody },
    );
  typia.assert<IEcommercePlatformAdministratorPromotionRequestOfCustomer>(
    promotionRequest,
  );
  // 4. Admin reviews and rejects the promotion request
  const rejectedRequest: IEcommercePlatformAdministratorPromotionRequestOfCustomer =
    await api.functional.ecommercePlatform.admin.administrator_promotion_requests.update(
      adminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          status: "rejected",
          rejectionReason:
            "The seller's application contains multiple policy violations and does not meet the criteria for administrator privileges.",
        } satisfies IEcommercePlatformAdministratorPromotionRequestOfCustomer.IUpdate,
      },
    );
  typia.assert<IEcommercePlatformAdministratorPromotionRequestOfCustomer>(
    rejectedRequest,
  );
  // 5. Seller retrieves the rejected promotion request
  const retrievedRequest: IEcommercePlatformAdministratorPromotionRequestOfCustomer =
    await api.functional.ecommercePlatform.seller.administrator_promotion_requests.at(
      sellerConnection,
      {
        requestId: promotionRequest.id,
      },
    );
  typia.assert<IEcommercePlatformAdministratorPromotionRequestOfCustomer>(
    retrievedRequest,
  );
  // 6. Validate the response
  TestValidator.equals(
    "status is rejected",
    retrievedRequest.status,
    "rejected",
  );
  // Validate rejectionReason is not null and matches
  typia.assertGuard(retrievedRequest.rejectionReason!);
  TestValidator.equals(
    "rejectionReason matches admin's rejection reason",
    retrievedRequest.rejectionReason,
    rejectedRequest.rejectionReason,
  );
  // Validate reviewedByAdmin contains the super administrator's summary profile
  typia.assertGuard(retrievedRequest.reviewedByAdmin!);
  TestValidator.equals(
    "reviewedByAdmin is not null",
    retrievedRequest.reviewedByAdmin !== null,
    true,
  );
  TestValidator.equals(
    "reviewedByAdmin.id matches admin id",
    retrievedRequest.reviewedByAdmin!.id,
    adminJoined.id,
  );
  TestValidator.equals(
    "reviewedByAdmin.is_super is true",
    retrievedRequest.reviewedByAdmin!.is_super,
    true,
  );
  TestValidator.equals(
    "reviewedByAdmin.is_banned is false",
    retrievedRequest.reviewedByAdmin!.is_banned,
    false,
  );
  // Validate reviewedAt is populated
  typia.assertGuard(retrievedRequest.reviewedAt!);
  TestValidator.equals(
    "reviewedAt is not null",
    retrievedRequest.reviewedAt !== null,
    true,
  );
  // Validate original reason is preserved
  TestValidator.equals(
    "reason matches original",
    retrievedRequest.reason,
    requestBody.reason,
  );
}
