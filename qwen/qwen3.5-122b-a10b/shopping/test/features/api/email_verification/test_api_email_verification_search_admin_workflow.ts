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
 * Test administrative email verification search workflow with comprehensive filtering.
 *
 * Validates the complete email verification search functionality for administrators, including authentication, data creation, and various filter combinations. Ensures that the search endpoint correctly returns verification records with proper pagination and all required fields.
 *
 * Special attention is given to verifying that filters work correctly when combined, that pagination metadata is accurate, and that email partial matching functions as expected through JOIN operations.
 *
 * 1. Administrator authenticates via admin join operation.
 * 2. Creates multiple customer accounts to generate email verification records.
 * 3. Searches with no filters to verify all records are returned with pagination.
 * 4. Filters by user_type='customer' to verify customer-only results.
 * 5. Filters by status='verified' to verify records with verified_at not null.
 * 6. Filters by status='pending' to verify records with verified_at null and future expires_at.
 * 7. Tests email partial matching via JOIN to customer email columns.
 * 8. Tests date range filters (created_at_from/to).
 * 9. Tests combined filters (user_type + status).
 * 10. Verifies pagination metadata accuracy.
 */
export async function test_api_email_verification_search_admin_workflow(
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
  // 2. Create multiple customer accounts to generate verification records
  const customerCount = 5;
  const customers: IEcommerceCustomer.IAuthorized[] = [];
  const customerEmails: string[] = [];
  await ArrayUtil.asyncRepeat(customerCount, async (index) => {
    const customerConnection: api.IConnection = { host: connection.host };
    const customerEmail =
      `${RandomGenerator.alphabets(8)}${index}@test.com` satisfies string &
        tags.Format<"email">;
    const customer = await authorize_customer_join(customerConnection, {
      body: {
        email: customerEmail,
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceCustomer.IJoin,
    });
    typia.assert(customer);
    customers.push(customer);
    customerEmails.push(customerEmail);
  });
  // 3. Search with no filters - verify all records returned
  const allRecords =
    await api.functional.ecommerce.customer.email_verifications.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IEcommerceCustomerEmailVerification.IRequest,
      },
    );
  typia.assert(allRecords);
  TestValidator.predicate(
    "all records returned",
    allRecords.data.length >= customerCount,
  );
  TestValidator.equals(
    "pagination current page",
    allRecords.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination has records",
    allRecords.pagination.records >= customerCount,
  );
  // 4. Filter by user_type='customer'
  const customerOnlyRecords =
    await api.functional.ecommerce.customer.email_verifications.index(
      adminConnection,
      {
        body: {
          user_type: "customer",
          page: 1,
          limit: 100,
        } satisfies IEcommerceCustomerEmailVerification.IRequest,
      },
    );
  typia.assert(customerOnlyRecords);
  TestValidator.predicate(
    "customer type filter returns customer records",
    customerOnlyRecords.data.every((r) => r.user_type === "customer"),
  );
  // 5. Filter by status='verified' - verified_at is not null
  const verifiedRecords =
    await api.functional.ecommerce.customer.email_verifications.index(
      adminConnection,
      {
        body: {
          status: "verified",
          page: 1,
          limit: 100,
        } satisfies IEcommerceCustomerEmailVerification.IRequest,
      },
    );
  typia.assert(verifiedRecords);
  TestValidator.predicate(
    "verified status has verified_at",
    verifiedRecords.data.every((r) => r.verified_at !== null),
  );
  // 6. Filter by status='pending' - verified_at is null and expires_at in future
  const pendingRecords =
    await api.functional.ecommerce.customer.email_verifications.index(
      adminConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 100,
        } satisfies IEcommerceCustomerEmailVerification.IRequest,
      },
    );
  typia.assert(pendingRecords);
  TestValidator.predicate(
    "pending status has null verified_at",
    pendingRecords.data.every((r) => r.verified_at === null),
  );
  const now = new Date();
  TestValidator.predicate(
    "pending status has future expires_at",
    pendingRecords.data.every((r) => new Date(r.expires_at) > now),
  );
  // 7. Email partial matching
  const targetEmail = customerEmails[0];
  const emailSearchTerm = targetEmail.split("@")[0];
  const emailFilteredRecords =
    await api.functional.ecommerce.customer.email_verifications.index(
      adminConnection,
      {
        body: {
          email: emailSearchTerm,
          page: 1,
          limit: 100,
        } satisfies IEcommerceCustomerEmailVerification.IRequest,
      },
    );
  typia.assert(emailFilteredRecords);
  TestValidator.predicate(
    "email partial match returns matching records",
    emailFilteredRecords.data.some((r) => r.email.includes(emailSearchTerm)),
  );
  // 8. Date range filters
  const earliestCreated = customers.reduce(
    (earliest, customer) =>
      new Date(customer.created_at) < new Date(earliest)
        ? customer.created_at
        : earliest,
    customers[0].created_at,
  );
  const dateRangeRecords =
    await api.functional.ecommerce.customer.email_verifications.index(
      adminConnection,
      {
        body: {
          created_at_from: earliestCreated,
          page: 1,
          limit: 100,
        } satisfies IEcommerceCustomerEmailVerification.IRequest,
      },
    );
  typia.assert(dateRangeRecords);
  TestValidator.predicate(
    "date range filter returns records after created_at_from",
    dateRangeRecords.data.every(
      (r) => new Date(r.created_at) >= new Date(earliestCreated),
    ),
  );
  // 9. Test combined filters (user_type + status)
  const combinedFilterRecords =
    await api.functional.ecommerce.customer.email_verifications.index(
      adminConnection,
      {
        body: {
          user_type: "customer",
          status: "pending",
          page: 1,
          limit: 100,
        } satisfies IEcommerceCustomerEmailVerification.IRequest,
      },
    );
  typia.assert(combinedFilterRecords);
  TestValidator.predicate(
    "combined filter returns matching records",
    combinedFilterRecords.data.every(
      (r) => r.user_type === "customer" && r.status === "pending",
    ),
  );
  // 10. Verify pagination metadata
  TestValidator.predicate(
    "pagination current is non-negative",
    allRecords.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    allRecords.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    allRecords.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    allRecords.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    allRecords.pagination.pages ===
      Math.ceil(allRecords.pagination.records / allRecords.pagination.limit),
  );
}