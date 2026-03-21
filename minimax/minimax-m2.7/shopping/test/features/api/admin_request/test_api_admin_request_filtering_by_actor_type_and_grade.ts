import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequest";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerAdminRequest";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminRequest";
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
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_customer_admin_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_admin_requests_create";
import { generate_random_ecommerce_mall_seller_seller_admin_requests_create } from "../../../generate/generate_random_ecommerce_mall_seller_seller_admin_requests_create";
import { prepare_random_ecommerce_mall_admin_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_request";
import { prepare_random_ecommerce_mall_seller_admin_request } from "../../../prepare/prepare_random_ecommerce_mall_seller_admin_request";

/**
 * Test super administrator filtering admin requests by actor type and requested grade for targeted audit workflows.
 *
 * 1. Authenticate as super administrator
 * 2. Create admin requests from both customers and sellers with different grades
 * 3. Call PATCH /superAdmin/admin/requests with { "actor_type": "seller" } to filter only seller requests
 * 4. Validate response contains only requests where actor_type = "seller"
 * 5. Call with { "actor_type": "customer" } to filter only customer requests
 * 6. Test filtering by requested_grade = "super_admin" for elevated privilege requests
 * 7. Test combining filters: { "actor_type": "customer", "requested_grade": "super_admin" }
 * 8. Verify combined filtering returns only requests matching both criteria
 * 9. Verify pagination works correctly with multiple filters applied
 */
export async function test_api_admin_request_filtering_by_actor_type_and_grade(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {});
  // 2. Create a customer and submit admin request
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const customerAdminRequest =
    await generate_random_ecommerce_mall_customer_admin_requests_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          requested_grade: "admin",
        },
      },
    );
  typia.assert(customerAdminRequest);
  // 3. Create another customer with super_admin request
  const customer2Connection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customer2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const customerSuperAdminRequest =
    await generate_random_ecommerce_mall_customer_admin_requests_create(
      customer2Connection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          requested_grade: "super_admin",
        },
      },
    );
  typia.assert(customerSuperAdminRequest);
  // 4. Create a seller and submit admin request
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const sellerAdminRequest =
    await generate_random_ecommerce_mall_seller_seller_admin_requests_create(
      sellerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(sellerAdminRequest);
  // 5. Create another seller with super_admin request
  const seller2Connection: api.IConnection = { host: connection.host };
  await authorize_seller_join(seller2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const sellerSuperAdminRequest =
    await generate_random_ecommerce_mall_seller_seller_admin_requests_create(
      seller2Connection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(sellerSuperAdminRequest);
  // 6. Get all requests to verify all 4 were created
  const allRequests =
    await api.functional.ecommerceMall.superAdmin.admin.requests.index(
      superAdminConnection,
      {
        body: {} satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(allRequests);
  TestValidator.equals(
    "should have 4 admin requests",
    allRequests.data.length,
    4,
  );
  // 7. Filter by actor_type = "seller" only
  const sellerOnlyRequests =
    await api.functional.ecommerceMall.superAdmin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          actor_type: "seller",
        } satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(sellerOnlyRequests);
  TestValidator.equals(
    "should have 2 seller requests",
    sellerOnlyRequests.data.length,
    2,
  );
  TestValidator.predicate("all should be seller actor_type", () =>
    sellerOnlyRequests.data.every((r) => r.actor_type === "seller"),
  );
  // 8. Filter by actor_type = "customer" only
  const customerOnlyRequests =
    await api.functional.ecommerceMall.superAdmin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          actor_type: "customer",
        } satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(customerOnlyRequests);
  TestValidator.equals(
    "should have 2 customer requests",
    customerOnlyRequests.data.length,
    2,
  );
  TestValidator.predicate("all should be customer actor_type", () =>
    customerOnlyRequests.data.every((r) => r.actor_type === "customer"),
  );
  // 9. Filter by requested_grade = "super_admin"
  const superAdminGradeRequests =
    await api.functional.ecommerceMall.superAdmin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          requested_grade: "super_admin",
        } satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(superAdminGradeRequests);
  TestValidator.equals(
    "should have 2 super_admin grade requests",
    superAdminGradeRequests.data.length,
    2,
  );
  TestValidator.predicate("all should be super_admin grade", () =>
    superAdminGradeRequests.data.every(
      (r) => r.requested_grade === "super_admin",
    ),
  );
  // 10. Filter by requested_grade = "admin"
  const adminGradeRequests =
    await api.functional.ecommerceMall.superAdmin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          requested_grade: "admin",
        } satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(adminGradeRequests);
  TestValidator.equals(
    "should have 2 admin grade requests",
    adminGradeRequests.data.length,
    2,
  );
  TestValidator.predicate("all should be admin grade", () =>
    adminGradeRequests.data.every((r) => r.requested_grade === "admin"),
  );
  // 11. Combine filters: actor_type = "customer" AND requested_grade = "super_admin"
  const customerSuperAdminCombined =
    await api.functional.ecommerceMall.superAdmin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          actor_type: "customer",
          requested_grade: "super_admin",
        } satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(customerSuperAdminCombined);
  TestValidator.equals(
    "should have 1 customer super_admin request",
    customerSuperAdminCombined.data.length,
    1,
  );
  TestValidator.predicate("should be customer with super_admin grade", () =>
    customerSuperAdminCombined.data.every(
      (r) => r.actor_type === "customer" && r.requested_grade === "super_admin",
    ),
  );
  // 12. Combine filters: actor_type = "seller" AND requested_grade = "admin"
  const sellerAdminCombined =
    await api.functional.ecommerceMall.superAdmin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          actor_type: "seller",
          requested_grade: "admin",
        } satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(sellerAdminCombined);
  TestValidator.equals(
    "should have 1 seller admin request",
    sellerAdminCombined.data.length,
    1,
  );
  TestValidator.predicate("should be seller with admin grade", () =>
    sellerAdminCombined.data.every(
      (r) => r.actor_type === "seller" && r.requested_grade === "admin",
    ),
  );
  // 13. Test pagination with filter applied
  const paginatedSellerRequests =
    await api.functional.ecommerceMall.superAdmin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          actor_type: "seller",
          page: 1,
          limit: 1,
        } satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(paginatedSellerRequests);
  TestValidator.equals(
    "should return 1 result per page",
    paginatedSellerRequests.data.length,
    1,
  );
  TestValidator.equals(
    "should have pagination total",
    paginatedSellerRequests.pagination.records,
    2,
  );
  TestValidator.equals(
    "should have 2 total pages",
    paginatedSellerRequests.pagination.pages,
    2,
  );
  TestValidator.predicate("all should be seller actor_type", () =>
    paginatedSellerRequests.data.every((r) => r.actor_type === "seller"),
  );
  // 14. Test pagination on second page
  const secondPageRequests =
    await api.functional.ecommerceMall.superAdmin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          actor_type: "seller",
          page: 2,
          limit: 1,
        } satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(secondPageRequests);
  TestValidator.equals(
    "should return 1 result on second page",
    secondPageRequests.data.length,
    1,
  );
  TestValidator.equals(
    "current page should be 2",
    secondPageRequests.pagination.current,
    2,
  );
}
