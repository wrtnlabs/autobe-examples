import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCustomerEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test edge case handling for empty and boundary results in email verification search.
 *
 * Validates the email verification search endpoint's ability to handle various edge cases gracefully, including empty result sets, impossible date ranges, and mismatched filter criteria. Ensures the API returns properly structured pagination metadata even when no records match the search criteria.
 *
 * The test covers multiple scenarios where search filters should return zero results:
 * 1. Future date range that cannot contain any records
 * 2. User type filter when no records of that type exist
 * 3. Status filter when no records with that status exist
 * 4. Combined filters that logically cannot match any records
 *
 * 1. Administrator authenticates successfully using admin join.
 * 2. Search with future created_at_from date (impossible range) returns empty results.
 * 3. Search with user_type='customer' returns empty results (no customer records exist).
 * 4. Search with status='verified' returns empty results (no verified records exist).
 * 5. Search with email filter that matches no records returns empty results.
 * 6. Validates pagination metadata shows records=0 and pages=0 for all empty result queries.
 * 7. Validates data array is empty for all zero-result queries.
 * 8. Confirms endpoint handles all edge cases without throwing exceptions.
 */
export async function test_api_email_verification_search_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Search with future created_at_from date (impossible range)
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 10);
  const futureSearch =
    await api.functional.ecommerce.customer.email_verifications.index(
      adminConnection,
      {
        body: {
          created_at_from: futureDate.toISOString(),
          limit: 10,
          page: 1,
        } satisfies IEcommerceCustomerEmailVerification.IRequest,
      },
    );
  typia.assert(futureSearch);
  TestValidator.equals(
    "future date search records count",
    futureSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "future date search pages count",
    futureSearch.pagination.pages,
    0,
  );
  TestValidator.equals(
    "future date search data array length",
    futureSearch.data.length,
    0,
  );
  // 3. Search with user_type='customer' returns empty results
  const customerTypeSearch =
    await api.functional.ecommerce.customer.email_verifications.index(
      adminConnection,
      {
        body: {
          user_type: "customer",
          limit: 10,
          page: 1,
        } satisfies IEcommerceCustomerEmailVerification.IRequest,
      },
    );
  typia.assert(customerTypeSearch);
  TestValidator.equals(
    "customer type search records count",
    customerTypeSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "customer type search pages count",
    customerTypeSearch.pagination.pages,
    0,
  );
  TestValidator.equals(
    "customer type search data array length",
    customerTypeSearch.data.length,
    0,
  );
  // 4. Search with status='verified' returns empty results
  const verifiedStatusSearch =
    await api.functional.ecommerce.customer.email_verifications.index(
      adminConnection,
      {
        body: {
          status: "verified",
          limit: 10,
          page: 1,
        } satisfies IEcommerceCustomerEmailVerification.IRequest,
      },
    );
  typia.assert(verifiedStatusSearch);
  TestValidator.equals(
    "verified status search records count",
    verifiedStatusSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "verified status search pages count",
    verifiedStatusSearch.pagination.pages,
    0,
  );
  TestValidator.equals(
    "verified status search data array length",
    verifiedStatusSearch.data.length,
    0,
  );
  // 5. Search with non-matching email filter
  const emailSearch =
    await api.functional.ecommerce.customer.email_verifications.index(
      adminConnection,
      {
        body: {
          email: "nonexistent@example.com",
          limit: 10,
          page: 1,
        } satisfies IEcommerceCustomerEmailVerification.IRequest,
      },
    );
  typia.assert(emailSearch);
  TestValidator.equals(
    "email filter search records count",
    emailSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "email filter search pages count",
    emailSearch.pagination.pages,
    0,
  );
  TestValidator.equals(
    "email filter search data array length",
    emailSearch.data.length,
    0,
  );
  // 6. Search with impossible date range (from > to)
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() + 5);
  const endDate = new Date();
  endDate.setFullYear(endDate.getFullYear() + 1);
  const impossibleDateSearch =
    await api.functional.ecommerce.customer.email_verifications.index(
      adminConnection,
      {
        body: {
          created_at_from: startDate.toISOString(),
          created_at_to: endDate.toISOString(),
          limit: 10,
          page: 1,
        } satisfies IEcommerceCustomerEmailVerification.IRequest,
      },
    );
  typia.assert(impossibleDateSearch);
  TestValidator.equals(
    "impossible date range records count",
    impossibleDateSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "impossible date range pages count",
    impossibleDateSearch.pagination.pages,
    0,
  );
  TestValidator.equals(
    "impossible date range data array length",
    impossibleDateSearch.data.length,
    0,
  );
  // 7. Search with status='pending' returns empty results
  const pendingStatusSearch =
    await api.functional.ecommerce.customer.email_verifications.index(
      adminConnection,
      {
        body: {
          status: "pending",
          limit: 10,
          page: 1,
        } satisfies IEcommerceCustomerEmailVerification.IRequest,
      },
    );
  typia.assert(pendingStatusSearch);
  TestValidator.equals(
    "pending status search records count",
    pendingStatusSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "pending status search pages count",
    pendingStatusSearch.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pending status search data array length",
    pendingStatusSearch.data.length,
    0,
  );
  // 8. Search with status='expired' returns empty results
  const expiredStatusSearch =
    await api.functional.ecommerce.customer.email_verifications.index(
      adminConnection,
      {
        body: {
          status: "expired",
          limit: 10,
          page: 1,
        } satisfies IEcommerceCustomerEmailVerification.IRequest,
      },
    );
  typia.assert(expiredStatusSearch);
  TestValidator.equals(
    "expired status search records count",
    expiredStatusSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "expired status search pages count",
    expiredStatusSearch.pagination.pages,
    0,
  );
  TestValidator.equals(
    "expired status search data array length",
    expiredStatusSearch.data.length,
    0,
  );
  // 9. Validate pagination structure for empty results
  TestValidator.predicate(
    "pagination current is 1",
    futureSearch.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    futureSearch.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination current is non-negative",
    futureSearch.pagination.current >= 0,
  );
}
