import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
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

export async function test_api_admin_customer_search_by_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) as string &
        tags.Format<"password">,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 2. Create multiple customers with known emails for search testing
  const customerEmail1 = typia.random<string & tags.Format<"email">>();
  const customerEmail2 = typia.random<string & tags.Format<"email">>();
  const customerEmail3 = typia.random<string & tags.Format<"email">>();
  await authorize_customer_join(connection, {
    body: {
      email: customerEmail1,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  await authorize_customer_join(connection, {
    body: {
      email: customerEmail2,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  await authorize_customer_join(connection, {
    body: {
      email: customerEmail3,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Extract unique identifier from email for partial matching test
  // e.g., "user123@example.com" -> extract "user123" or a portion of the email
  const emailPrefix1 = customerEmail1.split("@")[0];
  const partialSearchTerm = emailPrefix1.substring(
    0,
    Math.max(2, Math.floor(emailPrefix1.length / 2)),
  );
  // 4. Test partial email search - should find at least one matching customer
  const partialSearchResult =
    await api.functional.ecommerceMall.admin.customers.index(adminConnection, {
      body: {
        email: partialSearchTerm,
        limit: 20,
        page: 1,
      } satisfies IEcommerceMallCustomer.IRequest,
    });
  typia.assert(partialSearchResult);
  // Verify pagination structure
  TestValidator.equals(
    "pagination exists",
    partialSearchResult.pagination !== null,
    true,
  );
  TestValidator.predicate(
    "has valid pagination",
    partialSearchResult.pagination.limit > 0,
  );
  // 5. Test case-insensitive email search
  // Create customer with mixed case email to test case-insensitive search
  const mixedCaseEmail = `TestMixedCase${RandomGenerator.alphaNumeric(8)}@Example.COM`;
  await authorize_customer_join(connection, {
    body: {
      email: mixedCaseEmail as string & tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Search with lowercase version of the email prefix
  const lowercaseSearch = "testmixedcase";
  const caseInsensitiveResult =
    await api.functional.ecommerceMall.admin.customers.index(adminConnection, {
      body: {
        email: lowercaseSearch,
        limit: 20,
        page: 1,
      } satisfies IEcommerceMallCustomer.IRequest,
    });
  typia.assert(caseInsensitiveResult);
  // Verify the mixed case customer is found (case-insensitive matching)
  const foundMixedCase = caseInsensitiveResult.data.find((c) =>
    c.email.toLowerCase().includes(lowercaseSearch.toLowerCase()),
  );
  TestValidator.predicate(
    "case-insensitive search finds customer",
    foundMixedCase !== undefined,
  );
  // 6. Test search with non-existent email returns empty results
  const nonExistentResult =
    await api.functional.ecommerceMall.admin.customers.index(adminConnection, {
      body: {
        email: "thisemaildefinitelydoesnotexist123456789@example.com",
        limit: 20,
        page: 1,
      } satisfies IEcommerceMallCustomer.IRequest,
    });
  typia.assert(nonExistentResult);
  // Verify empty page with zero records
  TestValidator.equals(
    "empty search returns zero records",
    nonExistentResult.data.length,
    0,
  );
  TestValidator.equals(
    "pagination shows zero records",
    nonExistentResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination shows zero pages",
    nonExistentResult.pagination.pages,
    0,
  );
  // 7. Test pagination on search results - search that should return results
  const searchAllResult =
    await api.functional.ecommerceMall.admin.customers.index(adminConnection, {
      body: {
        email: emailPrefix1.substring(0, 1), // Search with just first character
        limit: 5,
        page: 1,
      } satisfies IEcommerceMallCustomer.IRequest,
    });
  typia.assert(searchAllResult);
  // Verify pagination metadata is correct
  TestValidator.equals(
    "limit is set correctly",
    searchAllResult.pagination.limit,
    5,
  );
  TestValidator.equals(
    "current page is 1",
    searchAllResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "records count is non-negative",
    searchAllResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    searchAllResult.pagination.pages >= 0,
  );
  // 8. Test page 2 pagination when limit is small and more results exist
  const pageTwoResult =
    await api.functional.ecommerceMall.admin.customers.index(adminConnection, {
      body: {
        email: emailPrefix1.substring(0, 1),
        limit: 1,
        page: 2,
      } satisfies IEcommerceMallCustomer.IRequest,
    });
  typia.assert(pageTwoResult);
  TestValidator.equals(
    "page 2 limit is set correctly",
    pageTwoResult.pagination.limit,
    1,
  );
  TestValidator.equals(
    "page 2 current is 2",
    pageTwoResult.pagination.current,
    2,
  );
}
