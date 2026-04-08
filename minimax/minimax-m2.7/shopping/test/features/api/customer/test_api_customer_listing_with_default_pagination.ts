import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that an authenticated administrator can successfully list all customers
 * with default pagination settings.
 *
 * Validates the core functionality of the admin customer listing endpoint
 * without any filters or search parameters. Verifies that the response
 * contains proper pagination metadata and customer data structure.
 *
 * 1. Administrator authenticates using admin join endpoint.
 * 2. Request is sent with empty body to use default pagination settings.
 * 3. Response validation includes pagination metadata and data array structure.
 * 4. Customer record structure is validated with required fields.
 * 5. Nested profile data structure is verified.
 * 6. Computed status field is derived correctly from deleted_at timestamp.
 * 7. Results are sorted by created_at in descending order (newest first).
 */
export async function test_api_customer_listing_with_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. List customers with default pagination (empty body)
  const response = await api.functional.ecommerceMall.admin.customers.index(
    adminConnection,
    {
      body: {},
    },
  );
  typia.assert(response);
  // 3. Validate pagination metadata with default values
  TestValidator.equals(
    "current page should be 1 (default)",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should be 20 (default)",
    response.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "records should be non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages should be non-negative",
    response.pagination.pages >= 0,
  );
  // 4. Validate response structure contains data array
  TestValidator.predicate(
    "data should be an array",
    Array.isArray(response.data),
  );
  // 5. Validate each customer record structure
  for (const customer of response.data) {
    typia.assert(customer);
    // Verify required fields exist
    TestValidator.predicate(
      "customer id should be valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        customer.id,
      ),
    );
    // Verify email exists and is non-empty
    TestValidator.predicate(
      "email should be non-empty string",
      typeof customer.email === "string" && customer.email.length > 0,
    );
    // Verify timestamps are valid ISO date-time format
    TestValidator.predicate(
      "created_at should be valid ISO date-time",
      !isNaN(Date.parse(customer.created_at)),
    );
    TestValidator.predicate(
      "updated_at should be valid ISO date-time",
      !isNaN(Date.parse(customer.updated_at)),
    );
    // Verify deleted_at is null or valid ISO date-time
    TestValidator.predicate(
      "deleted_at should be null or valid ISO date-time",
      customer.deleted_at === null || !isNaN(Date.parse(customer.deleted_at!)),
    );
    // Verify status is computed correctly
    const expectedStatus = customer.deleted_at === null ? "active" : "banned";
    TestValidator.equals(
      "status should be computed from deleted_at",
      customer.status,
      expectedStatus,
    );
    // Verify password_hash is NOT present (security)
    TestValidator.equals(
      "password_hash should not exist",
      (customer as any).password_hash,
      undefined,
    );
    // 6. Validate nested profile structure
    typia.assert(customer.profile);
    TestValidator.predicate(
      "profile id should be valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        customer.profile.id,
      ),
    );
    TestValidator.predicate(
      "display_name should be non-empty string",
      typeof customer.profile.display_name === "string" &&
        customer.profile.display_name.length > 0,
    );
    TestValidator.predicate(
      "phone should be non-empty string",
      typeof customer.profile.phone === "string" &&
        customer.profile.phone.length > 0,
    );
    TestValidator.predicate(
      "profile created_at should be valid ISO date-time",
      !isNaN(Date.parse(customer.profile.created_at)),
    );
    TestValidator.predicate(
      "profile updated_at should be valid ISO date-time",
      !isNaN(Date.parse(customer.profile.updated_at)),
    );
  }
  // 7. Verify results are sorted by created_at in descending order
  for (let i = 1; i < response.data.length; i++) {
    const prev = new Date(response.data[i - 1].created_at).getTime();
    const curr = new Date(response.data[i].created_at).getTime();
    TestValidator.predicate(
      "results should be sorted by created_at descending",
      prev >= curr,
    );
  }
}
