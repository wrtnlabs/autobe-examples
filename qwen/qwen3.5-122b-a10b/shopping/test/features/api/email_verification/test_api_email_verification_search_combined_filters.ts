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

export async function test_api_email_verification_search_combined_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - authenticate to access admin-only endpoint
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
  // 2. Create multiple customer accounts with different verification states
  const customerCount = 10;
  const customers: IEcommerceCustomer.IAuthorized[] = [];
  const customerEmails: string[] = [];
  await ArrayUtil.asyncRepeat(customerCount, async (index) => {
    const customerConnection: api.IConnection = { host: connection.host };
    const email = typia.random<string & tags.Format<"email">>();
    const customer = await authorize_customer_join(customerConnection, {
      body: {
        email,
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceCustomer.IJoin,
    });
    typia.assert(customer);
    customers.push(customer);
    customerEmails.push(email);
  });
  // 3. Test combined filter: user_type='customer' AND status='pending'
  const pendingFilterResult =
    await api.functional.ecommerce.customer.email_verifications.index(
      adminConnection,
      {
        body: {
          user_type: "customer",
          status: "pending",
          limit: 100,
        } satisfies IEcommerceCustomerEmailVerification.IRequest,
      },
    );
  typia.assert(pendingFilterResult);
  // All results should be customer type and pending status
  TestValidator.predicate(
    "all results are customer type",
    pendingFilterResult.data.every((item) => item.user_type === "customer"),
  );
  TestValidator.predicate(
    "all results are pending status",
    pendingFilterResult.data.every((item) => item.status === "pending"),
  );
  // 4. Test combined filter: user_type='customer' AND status='verified'
  // First, we need some verified records - but since we just created them, they're pending
  // We'll test with the structure that verified records would exist
  const verifiedFilterResult =
    await api.functional.ecommerce.customer.email_verifications.index(
      adminConnection,
      {
        body: {
          user_type: "customer",
          status: "verified",
          limit: 100,
        } satisfies IEcommerceCustomerEmailVerification.IRequest,
      },
    );
  typia.assert(verifiedFilterResult);
  // All results should be customer type and verified status
  TestValidator.predicate(
    "all verified results are customer type",
    verifiedFilterResult.data.every((item) => item.user_type === "customer"),
  );
  TestValidator.predicate(
    "all verified results are verified status",
    verifiedFilterResult.data.every((item) => item.status === "verified"),
  );
  // 5. Test email filter combined with status filter
  if (customerEmails.length > 0) {
    const firstCustomerEmail = customerEmails[0];
    const emailAndStatusFilter =
      await api.functional.ecommerce.customer.email_verifications.index(
        adminConnection,
        {
          body: {
            email: firstCustomerEmail,
            status: "pending",
            limit: 100,
          } satisfies IEcommerceCustomerEmailVerification.IRequest,
        },
      );
    typia.assert(emailAndStatusFilter);
    // All results should match the email filter
    TestValidator.predicate(
      "all results match email filter",
      emailAndStatusFilter.data.every(
        (item) => item.email === firstCustomerEmail,
      ),
    );
    TestValidator.predicate(
      "all results are pending status",
      emailAndStatusFilter.data.every((item) => item.status === "pending"),
    );
  }
  // 6. Test date range filters combined (created_at_from/to AND expires_at_from/to)
  const now = new Date();
  const dateRangeFilter =
    await api.functional.ecommerce.customer.email_verifications.index(
      adminConnection,
      {
        body: {
          created_at_from: new Date(
            now.getTime() - 24 * 60 * 60 * 1000,
          ).toISOString(), // 24 hours ago
          created_at_to: now.toISOString(),
          expires_at_from: new Date(
            now.getTime() - 12 * 60 * 60 * 1000,
          ).toISOString(), // 12 hours ago
          expires_at_to: new Date(
            now.getTime() + 24 * 60 * 60 * 1000,
          ).toISOString(), // 24 hours from now
          limit: 100,
        } satisfies IEcommerceCustomerEmailVerification.IRequest,
      },
    );
  typia.assert(dateRangeFilter);
  // All results should be within the created_at range
  TestValidator.predicate(
    "all results within created_at range",
    dateRangeFilter.data.every((item) => {
      const createdAt = new Date(item.created_at);
      const from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const to = now;
      return createdAt >= from && createdAt <= to;
    }),
  );
  // 7. Test all filters combined
  if (customerEmails.length > 0) {
    const firstCustomerEmail = customerEmails[0];
    const allFiltersCombined =
      await api.functional.ecommerce.customer.email_verifications.index(
        adminConnection,
        {
          body: {
            user_type: "customer",
            status: "pending",
            email: firstCustomerEmail,
            created_at_from: new Date(
              now.getTime() - 24 * 60 * 60 * 1000,
            ).toISOString(),
            created_at_to: now.toISOString(),
            limit: 100,
          } satisfies IEcommerceCustomerEmailVerification.IRequest,
        },
      );
    typia.assert(allFiltersCombined);
    // All results should match ALL filter criteria
    TestValidator.predicate(
      "all results match user_type filter",
      allFiltersCombined.data.every((item) => item.user_type === "customer"),
    );
    TestValidator.predicate(
      "all results match status filter",
      allFiltersCombined.data.every((item) => item.status === "pending"),
    );
    TestValidator.predicate(
      "all results match email filter",
      allFiltersCombined.data.every(
        (item) => item.email === firstCustomerEmail,
      ),
    );
    TestValidator.predicate(
      "all results match created_at range",
      allFiltersCombined.data.every((item) => {
        const createdAt = new Date(item.created_at);
        const from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const to = now;
        return createdAt >= from && createdAt <= to;
      }),
    );
  }
  // 8. Test pagination with filtered results
  const paginationTest =
    await api.functional.ecommerce.customer.email_verifications.index(
      adminConnection,
      {
        body: {
          user_type: "customer",
          status: "pending",
          limit: 3,
          page: 1,
        } satisfies IEcommerceCustomerEmailVerification.IRequest,
      },
    );
  typia.assert(paginationTest);
  // Verify pagination metadata
  TestValidator.predicate(
    "pagination current page is 1",
    paginationTest.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 3",
    paginationTest.pagination.limit === 3,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    paginationTest.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    paginationTest.pagination.pages >= 0,
  );
  // Verify data array length respects limit
  TestValidator.predicate(
    "data array length respects limit",
    paginationTest.data.length <= 3,
  );
  // 9. Test response structure consistency
  const structureTest =
    await api.functional.ecommerce.customer.email_verifications.index(
      adminConnection,
      {
        body: {
          limit: 100,
        } satisfies IEcommerceCustomerEmailVerification.IRequest,
      },
    );
  typia.assert(structureTest);
  // Verify all records have required fields
  TestValidator.predicate(
    "all records have id",
    structureTest.data.every((item) => typeof item.id === "string"),
  );
  TestValidator.predicate(
    "all records have email",
    structureTest.data.every((item) => typeof item.email === "string"),
  );
  TestValidator.predicate(
    "all records have status",
    structureTest.data.every((item) => typeof item.status === "string"),
  );
  TestValidator.predicate(
    "all records have user_type",
    structureTest.data.every((item) => typeof item.user_type === "string"),
  );
  TestValidator.predicate(
    "all records have created_at",
    structureTest.data.every((item) => typeof item.created_at === "string"),
  );
  TestValidator.predicate(
    "all records have expires_at",
    structureTest.data.every((item) => typeof item.expires_at === "string"),
  );
  TestValidator.predicate(
    "all records have verified_at (nullable)",
    structureTest.data.every(
      (item) =>
        item.verified_at === null || typeof item.verified_at === "string",
    ),
  );
}
