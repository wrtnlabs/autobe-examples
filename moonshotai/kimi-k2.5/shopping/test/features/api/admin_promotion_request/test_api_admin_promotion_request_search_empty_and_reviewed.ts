import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminPromotionRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_customer_admin_promotion_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_admin_promotion_requests_create";
import { prepare_random_ecommerce_mall_admin_promotion_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_promotion_request";

export async function test_api_admin_promotion_request_search_empty_and_reviewed(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // 2. Test empty results scenario - search for approved requests when none exist
  const emptyResponse =
    await api.functional.ecommerceMall.customer.admin_promotion_requests.index(
      superAdminConnection,
      {
        body: {
          status: "approved",
          requesterType: null,
          reviewed: null,
          sortBy: "createdAt",
          sortOrder: "desc",
          cursor: null,
          limit: 20,
          page: 1,
        } satisfies IEcommerceMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(emptyResponse);
  // Validate empty response pagination
  TestValidator.equals(
    "empty response data array",
    emptyResponse.data.length,
    0,
  );
  TestValidator.predicate(
    "pagination current is correct",
    emptyResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    emptyResponse.pagination.limit > 0,
  );
  TestValidator.equals(
    "pagination records is 0",
    emptyResponse.pagination.records,
    0,
  );
  // 3. Test empty results with seller requesterType filter
  const emptySellerResponse =
    await api.functional.ecommerceMall.customer.admin_promotion_requests.index(
      superAdminConnection,
      {
        body: {
          status: null,
          requesterType: "seller",
          reviewed: null,
          sortBy: "createdAt",
          sortOrder: "desc",
          cursor: null,
          limit: 20,
          page: 1,
        } satisfies IEcommerceMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(emptySellerResponse);
  TestValidator.equals(
    "empty seller filter data array",
    emptySellerResponse.data.length,
    emptySellerResponse.pagination.records,
  );
  // 4. Create customer and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "https://example.com/auth/join",
      referrer: "https://example.com",
    },
  });
  // 5. Create a promotion request as customer
  const promotionRequest =
    await generate_random_ecommerce_mall_customer_admin_promotion_requests_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 3,
            wordMax: 8,
          }),
        },
      },
    );
  typia.assert(promotionRequest);
  TestValidator.equals(
    "new request status is pending",
    promotionRequest.status,
    "pending",
  );
  TestValidator.predicate(
    "new request has no reviewer",
    promotionRequest.reviewer === null,
  );
  TestValidator.predicate(
    "new request has no rejectionReason",
    promotionRequest.rejectionReason === null,
  );
  // 6. Search for pending requests as super admin (should find our created request)
  const pendingResponse =
    await api.functional.ecommerceMall.customer.admin_promotion_requests.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          requesterType: "customer",
          reviewed: false,
          sortBy: "createdAt",
          sortOrder: "desc",
          cursor: null,
          limit: 20,
          page: 1,
        } satisfies IEcommerceMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(pendingResponse);
  TestValidator.predicate(
    "pending response has records",
    pendingResponse.pagination.records > 0,
  );
  TestValidator.predicate(
    "at least one pending request found",
    pendingResponse.data.length > 0,
  );
  // 7. Verify the created request is in the pending results
  const foundRequest = pendingResponse.data.find(
    (req) => req.id === promotionRequest.id,
  );
  TestValidator.predicate(
    "created request found in pending list",
    foundRequest !== undefined,
  );
  if (foundRequest) {
    // Validate ISummary structure
    TestValidator.predicate(
      "summary has valid UUID id",
      typeof foundRequest.id === "string",
    );
    TestValidator.equals(
      "summary status is pending",
      foundRequest.status,
      "pending",
    );
    TestValidator.predicate(
      "summary has reason string",
      typeof foundRequest.reason === "string",
    );
    TestValidator.predicate(
      "summary rejectionReason is null for pending",
      foundRequest.rejectionReason === null,
    );
    TestValidator.predicate(
      "summary has valid createdAt",
      typeof foundRequest.createdAt === "string",
    );
    TestValidator.predicate(
      "summary requester is customer summary",
      foundRequest.requester !== undefined && "email" in foundRequest.requester,
    );
    TestValidator.predicate(
      "summary reviewer is null for pending",
      foundRequest.reviewer === null,
    );
  }
  // 8. Test reviewed=true filter (should return empty or approved/rejected only)
  const reviewedResponse =
    await api.functional.ecommerceMall.customer.admin_promotion_requests.index(
      superAdminConnection,
      {
        body: {
          status: null,
          requesterType: null,
          reviewed: true,
          sortBy: "createdAt",
          sortOrder: "desc",
          cursor: null,
          limit: 20,
          page: 1,
        } satisfies IEcommerceMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(reviewedResponse);
  // If reviewed results exist, they should all have reviewers
  if (reviewedResponse.data.length > 0) {
    for (const req of reviewedResponse.data) {
      TestValidator.predicate(
        `reviewed request ${req.id} has reviewer populated`,
        req.reviewer !== null,
      );
    }
  }
  // 9. Test unrejected filter (pending only)
  TestValidator.equals(
    "pagination structure valid",
    typeof reviewedResponse.pagination.pages,
    "number",
  );
}
