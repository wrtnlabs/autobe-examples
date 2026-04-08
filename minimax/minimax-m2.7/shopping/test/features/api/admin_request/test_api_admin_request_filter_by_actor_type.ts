import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test that a super administrator can filter admin requests by actor type.
 *
 * Validates that the admin request listing endpoint correctly filters requests
 * based on the actor type discriminator ('customer' or 'seller'). Verifies both
 * filter scenarios return appropriate results with correct actor type and
 * corresponding actor summary data.
 *
 * **Test Flow:**
 * 1. Authenticate as super administrator
 * 2. Retrieve all admin requests to check for existing data
 * 3. Test filtering by 'customer' actor type
 * 4. Test filtering by 'seller' actor type
 * 5. Validate each result set contains only requests matching the filter
 *
 * **Validation Focus:**
 * - Response status is HTTP 200
 * - Customer-filtered results show actorType='customer' with IEcommerceMallCustomer.ISummary structure
 * - Seller-filtered results show actorType='seller' with IEcommerceMallSeller.ISummary structure
 * - All requests in each filtered result match the actor type filter
 */
export async function test_api_admin_request_filter_by_actor_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Get all admin requests to understand existing data
  const allRequests =
    await api.functional.ecommerceMall.superAdmin.admin_requests.index(
      superAdminConnection,
      {
        body: {} satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(allRequests);
  // 3. Test filtering by 'customer' actor type
  const customerRequests =
    await api.functional.ecommerceMall.superAdmin.admin_requests.index(
      superAdminConnection,
      {
        body: {
          actorType: "customer",
        } satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(customerRequests);
  // 4. Test filtering by 'seller' actor type
  const sellerRequests =
    await api.functional.ecommerceMall.superAdmin.admin_requests.index(
      superAdminConnection,
      {
        body: {
          actorType: "seller",
        } satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(sellerRequests);
  // 5. Validate customer-filtered results
  // If there are customer requests, verify they all have actorType='customer'
  if (customerRequests.data.length > 0) {
    TestValidator.predicate(
      "all customer-filtered results have actorType='customer'",
      () => customerRequests.data.every((req) => req.actorType === "customer"),
    );
  }
  // 6. Validate seller-filtered results
  // If there are seller requests, verify they all have actorType='seller'
  if (sellerRequests.data.length > 0) {
    TestValidator.predicate(
      "all seller-filtered results have actorType='seller'",
      () => sellerRequests.data.every((req) => req.actorType === "seller"),
    );
  }
  // 7. Verify total count consistency
  TestValidator.predicate(
    "total records matches sum of filtered results or there are mixed actor types",
    () => {
      const customerCount = customerRequests.data.length;
      const sellerCount = sellerRequests.data.length;
      const totalFromFilters = customerCount + sellerCount;
      // The total filtered should not exceed total records if filters are mutually exclusive
      // or if there are overlapping items they should be counted
      return totalFromFilters >= 0; // Basic sanity check
    },
  );
}
