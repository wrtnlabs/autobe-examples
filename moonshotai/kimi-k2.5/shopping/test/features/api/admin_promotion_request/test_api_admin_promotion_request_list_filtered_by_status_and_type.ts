import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminPromotionRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test filtering administrator promotion requests by status and requester type.
 * A seller with super admin privileges queries pending promotion requests submitted
 * by customers only. Validates that the filtering mechanism correctly applies the
 * status='pending' and requesterType='customer' filters. Additionally tests the
 * reviewed filter for unreviewed only requests.
 */
export async function test_api_admin_promotion_request_list_filtered_by_status_and_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller (super admin privileges required)
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorizedSeller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<IEcommerceMallSeller.IJoin["email"]>(),
      password: typia.random<IEcommerceMallSeller.IJoin["password"]>(),
      href: typia.random<IEcommerceMallSeller.IJoin["href"]>(),
      referrer: typia.random<IEcommerceMallSeller.IJoin["referrer"]>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(authorizedSeller);
  // 2. Test filtering by status='pending' and requesterType='customer'
  const pendingCustomerRequests: IPageIEcommerceMallAdminPromotionRequest.ISummary =
    await api.functional.ecommerceMall.seller.admin_promotion_requests.index(
      sellerConnection,
      {
        body: {
          status: "pending",
          requesterType: "customer",
          reviewed: null,
          sortBy: null,
          sortOrder: null,
          cursor: null,
          limit:
            typia.random<
              IEcommerceMallAdminPromotionRequest.IRequest["limit"]
            >(),
          page: null,
        } satisfies IEcommerceMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(pendingCustomerRequests);
  // Validate that all returned items have pending status and customer requester
  for (const request of pendingCustomerRequests.data) {
    TestValidator.equals("status should be pending", request.status, "pending");
    // Customer ISummary is an empty object, Seller ISummary has properties
    // If it has no properties other than what's checked by typia, it's a customer
    const requesterKeys = Object.keys(request.requester);
    TestValidator.predicate(
      "requester should be customer (empty summary)",
      requesterKeys.length === 0 ||
        (requesterKeys.length === 1 && requesterKeys[0] === "id"),
    );
  }
  // 3. Test filtering by reviewed=false (unreviewed only)
  const unreviewedRequests: IPageIEcommerceMallAdminPromotionRequest.ISummary =
    await api.functional.ecommerceMall.seller.admin_promotion_requests.index(
      sellerConnection,
      {
        body: {
          status: null,
          requesterType: null,
          reviewed: false,
          sortBy: null,
          sortOrder: null,
          cursor: null,
          limit:
            typia.random<
              IEcommerceMallAdminPromotionRequest.IRequest["limit"]
            >(),
          page: null,
        } satisfies IEcommerceMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(unreviewedRequests);
  // Validate that all unreviewed requests have no reviewer and are pending
  for (const request of unreviewedRequests.data) {
    TestValidator.equals(
      "reviewer should be null for unreviewed",
      request.reviewer,
      null,
    );
    TestValidator.equals(
      "unreviewed request should have pending status",
      request.status,
      "pending",
    );
  }
  // 4. Test filtering by requesterType='seller'
  const sellerRequests: IPageIEcommerceMallAdminPromotionRequest.ISummary =
    await api.functional.ecommerceMall.seller.admin_promotion_requests.index(
      sellerConnection,
      {
        body: {
          status: null,
          requesterType: "seller",
          reviewed: null,
          sortBy: null,
          sortOrder: null,
          cursor: null,
          limit:
            typia.random<
              IEcommerceMallAdminPromotionRequest.IRequest["limit"]
            >(),
          page: null,
        } satisfies IEcommerceMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(sellerRequests);
  // 5. Test filtering by approved status
  const approvedRequests: IPageIEcommerceMallAdminPromotionRequest.ISummary =
    await api.functional.ecommerceMall.seller.admin_promotion_requests.index(
      sellerConnection,
      {
        body: {
          status: "approved",
          requesterType: null,
          reviewed: null,
          sortBy: null,
          sortOrder: null,
          cursor: null,
          limit:
            typia.random<
              IEcommerceMallAdminPromotionRequest.IRequest["limit"]
            >(),
          page: null,
        } satisfies IEcommerceMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(approvedRequests);
  // Validate that all approved requests have been reviewed and have a reviewer
  for (const request of approvedRequests.data) {
    TestValidator.predicate(
      "approved request should have reviewer",
      request.reviewer !== null,
    );
    TestValidator.equals("approved request status", request.status, "approved");
  }
}
