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
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_customer_admin_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_admin_requests_create";
import { prepare_random_ecommerce_mall_admin_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_request";

/**
 * Test super administrator filtering admin requests by status (pending) to review requests awaiting approval.
 *
 * This test validates the admin request filtering functionality:
 * 1. Authenticate as super administrator using POST /auth/superAdmin/join
 * 2. Create multiple admin requests from different customers with varying statuses
 * 3. Call PATCH /superAdmin/admin/requests with status filter
 * 4. Validate response returns only requests matching the filtered status
 * 5. Test filtering with different status values (pending, approved, rejected)
 * 6. Verify filtering combines correctly with pagination
 */
export async function test_api_admin_request_filtering_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create multiple customers and admin requests for filtering tests
  const createdRequests: IEcommerceMallAdminRequest[] = [];
  // Create 5 customers with admin requests
  for (let i = 0; i < 5; i++) {
    const customerConnection: api.IConnection = { host: connection.host };
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
    const request =
      await generate_random_ecommerce_mall_customer_admin_requests_create(
        customerConnection,
        {
          body: {
            reason: RandomGenerator.paragraph({ sentences: 2 }),
            requested_grade: RandomGenerator.pick([
              "admin",
              "super_admin",
            ] as const),
          },
        },
      );
    createdRequests.push(request);
  }
  // 3. Test filtering by "pending" status
  const pendingResponse =
    await api.functional.ecommerceMall.superAdmin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(pendingResponse);
  // 4. Validate all returned requests have status = "pending"
  TestValidator.predicate(
    "pending filter returns only pending requests",
    pendingResponse.data.length > 0 &&
      pendingResponse.data.every((req) => req.status === "pending"),
  );
  // 5. Test filtering by "approved" status (should return empty or fewer items)
  const approvedResponse =
    await api.functional.ecommerceMall.superAdmin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          status: "approved",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(approvedResponse);
  // Validate all returned requests have status = "approved"
  TestValidator.predicate(
    "approved filter returns only approved requests",
    approvedResponse.data.every((req) => req.status === "approved"),
  );
  // 6. Test filtering by "rejected" status (should return empty or fewer items)
  const rejectedResponse =
    await api.functional.ecommerceMall.superAdmin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          status: "rejected",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(rejectedResponse);
  // Validate all returned requests have status = "rejected"
  TestValidator.predicate(
    "rejected filter returns only rejected requests",
    rejectedResponse.data.every((req) => req.status === "rejected"),
  );
  // 7. Test filtering combines correctly with pagination
  // Get all pending requests first
  const allPendingResponse =
    await api.functional.ecommerceMall.superAdmin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(allPendingResponse);
  const totalPendingCount = allPendingResponse.pagination.records;
  // Test pagination with pending filter
  if (totalPendingCount > 1) {
    const page1Response =
      await api.functional.ecommerceMall.superAdmin.admin.requests.index(
        superAdminConnection,
        {
          body: {
            status: "pending",
            page: 1,
            limit: 2,
          } satisfies IEcommerceMallAdminRequest.IRequest,
        },
      );
    typia.assert(page1Response);
    const page2Response =
      await api.functional.ecommerceMall.superAdmin.admin.requests.index(
        superAdminConnection,
        {
          body: {
            status: "pending",
            page: 2,
            limit: 2,
          } satisfies IEcommerceMallAdminRequest.IRequest,
        },
      );
    typia.assert(page2Response);
    // Validate pagination metadata
    TestValidator.equals(
      "pagination limit is 2",
      page1Response.pagination.limit,
      2,
    );
    TestValidator.equals(
      "current page is 1",
      page1Response.pagination.current,
      1,
    );
    TestValidator.equals(
      "current page is 2 on second page",
      page2Response.pagination.current,
      2,
    );
    TestValidator.predicate(
      "both pages return only pending requests",
      page1Response.data.every((req) => req.status === "pending") &&
        page2Response.data.every((req) => req.status === "pending"),
    );
    TestValidator.predicate(
      "page 2 items are different from page 1",
      page1Response.data[0].id !== page2Response.data[0].id,
    );
  }
  // 8. Verify no filter returns all statuses (including pending, approved, rejected)
  const noFilterResponse =
    await api.functional.ecommerceMall.superAdmin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(noFilterResponse);
  TestValidator.predicate(
    "no filter returns requests with mixed statuses",
    noFilterResponse.data.length >= pendingResponse.data.length,
  );
}
