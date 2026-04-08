import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
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
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test that an administrator can filter customers by registration date range and sorting options.
 *
 * Validates the admin customer listing endpoint with date range filtering and sorting functionality.
 * This test ensures administrators can efficiently browse and search customer accounts using
 * various filter criteria and sorting options.
 *
 * 1. Administrator registers and authenticates to access admin endpoints.
 * 2. Multiple test customers are created with known registration timestamps.
 * 3. Tests date range filtering - all returned customers must fall within the specified range.
 * 4. Tests ascending sort by created_at - oldest customers appear first.
 * 5. Tests descending sort by created_at - newest customers appear first.
 * 6. Tests sorting by email alphabetically in ascending order.
 * 7. Tests pagination navigation with different sort options.
 */
export async function test_api_customer_filtering_by_date_range_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AdminPass123!",
      name: "Test Admin",
      href: "https://example.com/admin",
      referrer: "https://example.com/",
    },
  });
  // 2. Create test customers with known registration dates
  const customerEmails: string[] = [];
  const customerCount = 5;
  for (let i = 0; i < customerCount; i++) {
    const customerConnection: api.IConnection = { host: connection.host };
    const authorized = await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "CustomerPass123!",
        name: `Test Customer ${i + 1}`,
        href: "https://example.com/customer",
        referrer: "https://example.com/",
      },
    });
    customerEmails.push(authorized.email);
  }
  // Calculate date range (30 days ago to now)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  // 3. Test date range filtering with ascending sort by created_at
  const ascResult = await api.functional.ecommerceMall.admin.customers.index(
    adminConnection,
    {
      body: {
        createdAtFrom: thirtyDaysAgo.toISOString(),
        createdAtTo: now.toISOString(),
        sortBy: "created_at",
        sortOrder: "asc",
        page: 1,
        limit: 50,
      },
    },
  );
  typia.assert(ascResult);
  // 4. Validate pagination structure
  TestValidator.equals(
    "has pagination",
    ascResult.pagination !== undefined,
    true,
  );
  TestValidator.predicate("page is 1", ascResult.pagination.current === 1);
  TestValidator.predicate("has data", ascResult.data.length > 0);
  // 5. Validate all customers are within date range
  for (const customer of ascResult.data) {
    const createdAt = new Date(customer.created_at);
    TestValidator.predicate(
      "customer within date range",
      createdAt >= thirtyDaysAgo && createdAt <= now,
    );
  }
  // 6. Validate ascending order (first record <= subsequent records)
  for (let i = 1; i < ascResult.data.length; i++) {
    const prevCreatedAt = new Date(ascResult.data[i - 1].created_at);
    const currCreatedAt = new Date(ascResult.data[i].created_at);
    TestValidator.predicate(
      "ascending created_at order",
      prevCreatedAt.getTime() <= currCreatedAt.getTime(),
    );
  }
  // 7. Test descending sort by created_at
  const descResult = await api.functional.ecommerceMall.admin.customers.index(
    adminConnection,
    {
      body: {
        createdAtFrom: thirtyDaysAgo.toISOString(),
        createdAtTo: now.toISOString(),
        sortBy: "created_at",
        sortOrder: "desc",
        page: 1,
        limit: 50,
      },
    },
  );
  typia.assert(descResult);
  // 8. Validate descending order (first record >= subsequent records)
  for (let i = 1; i < descResult.data.length; i++) {
    const prevCreatedAt = new Date(descResult.data[i - 1].created_at);
    const currCreatedAt = new Date(descResult.data[i].created_at);
    TestValidator.predicate(
      "descending created_at order",
      prevCreatedAt.getTime() >= currCreatedAt.getTime(),
    );
  }
  // 9. Test sorting by email alphabetically (ascending)
  const emailAscResult =
    await api.functional.ecommerceMall.admin.customers.index(adminConnection, {
      body: {
        createdAtFrom: thirtyDaysAgo.toISOString(),
        createdAtTo: now.toISOString(),
        sortBy: "email",
        sortOrder: "asc",
        page: 1,
        limit: 50,
      },
    });
  typia.assert(emailAscResult);
  // Validate email alphabetical order
  for (let i = 1; i < emailAscResult.data.length; i++) {
    const prevEmail = emailAscResult.data[i - 1].email.toLowerCase();
    const currEmail = emailAscResult.data[i].email.toLowerCase();
    TestValidator.predicate(
      "ascending email order",
      prevEmail.localeCompare(currEmail) <= 0,
    );
  }
  // 10. Test pagination - request page 2
  if (ascResult.pagination.pages > 1) {
    const page2Result =
      await api.functional.ecommerceMall.admin.customers.index(
        adminConnection,
        {
          body: {
            createdAtFrom: thirtyDaysAgo.toISOString(),
            createdAtTo: now.toISOString(),
            sortBy: "created_at",
            sortOrder: "asc",
            page: 2,
            limit: 2,
          },
        },
      );
    typia.assert(page2Result);
    TestValidator.equals("page 2", page2Result.pagination.current, 2);
    TestValidator.predicate("has data on page 2", page2Result.data.length > 0);
    // Validate page 2 customers come after page 1 customers (in ascending order)
    if (ascResult.data.length >= 2) {
      const lastPage1Email = ascResult.data[1].email.toLowerCase();
      const firstPage2Email = page2Result.data[0].email.toLowerCase();
      TestValidator.predicate(
        "page 2 follows page 1 in pagination",
        lastPage1Email.localeCompare(firstPage2Email) <= 0,
      );
    }
  }
  // 11. Verify created_at sort is consistent across pages
  if (ascResult.pagination.pages > 1 && ascResult.data.length > 0) {
    const page1LastCreatedAt = new Date(
      ascResult.data[ascResult.data.length - 1].created_at,
    );
    const page2Result =
      await api.functional.ecommerceMall.admin.customers.index(
        adminConnection,
        {
          body: {
            createdAtFrom: thirtyDaysAgo.toISOString(),
            createdAtTo: now.toISOString(),
            sortBy: "created_at",
            sortOrder: "asc",
            page: 2,
            limit: 10,
          },
        },
      );
    typia.assert(page2Result);
    if (page2Result.data.length > 0) {
      const page2FirstCreatedAt = new Date(page2Result.data[0].created_at);
      TestValidator.predicate(
        "page 2 starts after page 1 ends (ascending)",
        page1LastCreatedAt.getTime() <= page2FirstCreatedAt.getTime(),
      );
    }
  }
}
