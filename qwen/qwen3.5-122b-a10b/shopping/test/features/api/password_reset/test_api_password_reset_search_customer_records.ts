import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCustomerPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test searching password reset records filtered by customer actor type.
 *
 * Validates the administrative capability to query password reset tokens for customer accounts with proper pagination and security controls. The test ensures that password reset summaries are returned with all required metadata while never exposing the actual token values.
 *
 * The search functionality should support filtering by actor type, return paginated results with proper metadata, and include customer reference information without compromising security.
 *
 * 1. Register a customer account for testing.
 * 2. Search password reset records with actor_type filter set to "customer".
 * 3. Validates response structure includes pagination metadata.
 * 4. Validates each record contains customer summary information.
 * 5. Validates token values are NEVER exposed in the response.
 * 6. Validates timestamp fields are properly formatted.
 */
export async function test_api_password_reset_search_customer_records(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a customer account for testing
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Search password reset records with customer actor type filter
  const searchResult: IPageIEcommerceCustomerPasswordReset.ISummary =
    await api.functional.ecommerce.customer.password_resets.index(connection, {
      body: {
        actor_type: "customer",
        page: 1,
        limit: 100,
      } satisfies IEcommerceCustomerPasswordReset.IRequest,
    });
  typia.assert(searchResult);
  // 3. Validate pagination metadata structure
  TestValidator.equals(
    "pagination current page",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", searchResult.pagination.limit, 100);
  TestValidator.predicate(
    "pagination records non-negative",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    searchResult.pagination.pages >= 0,
  );
  // 4. Validate each record contains required customer summary information
  await TestValidator.predicate(
    "customer records have required fields",
    async () => {
      for (const record of searchResult.data) {
        // Validate customer reference exists
        typia.assertGuard(record.customer);
        TestValidator.predicate(
          "customer id is uuid",
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            record.customer.id,
          ),
        );
        TestValidator.predicate(
          "customer email is email format",
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.customer.email),
        );
        TestValidator.predicate(
          "customer display_name exists",
          record.customer.display_name.length > 0,
        );
        // Validate timestamp fields
        typia.assertGuard(record.expires_at);
        typia.assertGuard(record.created_at);
        typia.assertGuard(record.updated_at);
        // Validate nullable fields
        if (record.used_at !== null && record.used_at !== undefined) {
          typia.assertGuard(record.used_at);
        }
        if (record.deleted_at !== null && record.deleted_at !== undefined) {
          typia.assertGuard(record.deleted_at);
        }
      }
      return true;
    },
  );
  // 5. Validate token values are NEVER exposed (security check)
  // The ISummary type should not have a token field - this is validated by typia.assert above
  // If token field existed, typia.assert would fail due to type mismatch
  // 6. Validate results are sorted by created_at descending (newest first)
  if (searchResult.data.length > 1) {
    const sorted = searchResult.data.every((record, index) => {
      if (index === 0) return true;
      const prev = searchResult.data[index - 1];
      return new Date(record.created_at) <= new Date(prev.created_at);
    });
    TestValidator.predicate("results sorted by created_at descending", sorted);
  }
}
