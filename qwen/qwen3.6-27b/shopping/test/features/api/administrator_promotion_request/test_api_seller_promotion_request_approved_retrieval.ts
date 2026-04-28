import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformAdministratorPromotionRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdministratorPromotionRequestOfCustomer";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import { prepare_random_ecommerce_platform_administrator_promotion_request_of_customer } from "../../../prepare/prepare_random_ecommerce_platform_administrator_promotion_request_of_customer";
import { generate_random_ecommerce_platform_seller_administrator_promotion_requests_create } from "../../../generate/generate_random_ecommerce_platform_seller_administrator_promotion_requests_create";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
/**
 * Validates seller retrieval of approved administrator promotion request.
 *
 * Verifies the complete promotion request approval workflow from seller application through admin approval to final retrieval by the seller. Ensures that the request status correctly transitions to approved, rejection reason is null for approved requests, and review metadata is populated.
 *
 * Special attention is given to validating that the reviewedByAdmin field contains the super administrator summary and that reviewedAt timestamp reflects the approval moment, while original request properties remain unchanged.
 *
 * 1. Seller joins the platform with unique email and authentication credentials.
 * 2. Seller submits an administrator promotion request with justifications.
 * 3. Administrator joins the platform with their own credentials.
 * 4. Administrator approves the seller's pending promotion request.
 * 5. Seller retrieves the promotion request by its ID showing approved status.
 * 6. Validates status, null rejectionReason, populated reviewer, and preserved original data.
 */
export async function test_api_seller_promotion_request_approved_retrieval(connection: api.IConnection): Promise<void> {
    // 1. Seller joins the platform
    const sellerConnection: api.IConnection = { host: connection.host };
    await authorize_seller_join(sellerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: typia.random<string & tags.Format<"password">>(),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IEcommercePlatformSeller.IJoin,
    });
    // 2. Seller submits administrator promotion request
    const promotionRequest = await generate_random_ecommerce_platform_seller_administrator_promotion_requests_create(sellerConnection, {
        body: { actorType: "seller" },
    });
    typia.assert(promotionRequest);
    // 3. Administrator joins the platform
    const adminConnection: api.IConnection = { host: connection.host };
    await authorize_admin_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: typia.random<string & tags.Format<"password">>(),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IEcommercePlatformAdmin.IJoin,
    });
    // 4. Administrator approves the promotion request
    const approvedRequest = await api.functional.ecommercePlatform.admin.administrator_promotion_requests.update(adminConnection, {
        requestId: promotionRequest.id,
        body: {
            status: "approved",
        } satisfies IEcommercePlatformAdministratorPromotionRequestOfCustomer.IUpdate,
    });
    typia.assert(approvedRequest);
    // 5. Seller retrieves the approved promotion request
    const retrievedRequest = await api.functional.ecommercePlatform.seller.administrator_promotion_requests.at(sellerConnection, {
        requestId: promotionRequest.id,
    });
    typia.assert(retrievedRequest);
    // 6. Validate approved status fields
    TestValidator.equals("status is approved", retrievedRequest.status, "approved");
    TestValidator.equals("rejectionReason is null", retrievedRequest.rejectionReason, null);
    TestValidator.predicate("reviewedByAdmin is populated", retrievedRequest.reviewedByAdmin !== null);
    TestValidator.predicate("reviewedAt is populated", retrievedRequest.reviewedAt !== null);
    TestValidator.equals("actorType preserved", retrievedRequest.actorType, "seller");
    TestValidator.equals("reason preserved", retrievedRequest.reason, promotionRequest.reason);
}