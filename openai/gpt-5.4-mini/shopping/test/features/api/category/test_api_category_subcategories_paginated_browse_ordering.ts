import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_category_subcategories_paginated_browse_ordering(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Validate paginated browsing of direct subcategories with deterministic ordering.
   *
   * This test registers a customer account and then requests two pages of direct subcategories
   * for the same category using an explicit sort order. It verifies pagination metadata,
   * compares page contents for overlap, and confirms deterministic ordering for stable
   * customer navigation through category hierarchies.
   *
   * 1. Register a customer and prepare an authenticated customer connection.
   * 2. Request the first and second pages of the same category with explicit sorting.
   * 3. Verify pagination metadata remains stable across both requests.
   * 4. Confirm page contents do not overlap and are ordered deterministically when present.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email:
        `customer_${RandomGenerator.alphabets(8)}@example.com` satisfies string &
          tags.Format<"email">,
      password: "Password123!" as string & tags.Format<"password">,
      href: "https://example.com/signup",
      referrer: "https://example.com/",
      ip: null,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const categoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const firstPage =
    await api.functional.mallPlatform.customer.categories.subcategories.index(
      customerConnection,
      {
        categoryId,
        body: {
          page: 1,
          limit: 10,
          sort: "name_asc",
        } satisfies IMallPlatformCategory.IRequest,
      },
    );
  typia.assert(firstPage);
  const laterPage =
    await api.functional.mallPlatform.customer.categories.subcategories.index(
      customerConnection,
      {
        categoryId,
        body: {
          page: 2,
          limit: 10,
          sort: "name_asc",
        } satisfies IMallPlatformCategory.IRequest,
      },
    );
  typia.assert(laterPage);
  TestValidator.equals(
    "first page current should be 1",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page limit should match request",
    firstPage.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "first page records should be non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "first page pages should be non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "first page data should not exceed limit",
    firstPage.data.length <= firstPage.pagination.limit,
  );
  TestValidator.equals(
    "later page current should be 2",
    laterPage.pagination.current,
    2,
  );
  TestValidator.equals(
    "later page limit should match request",
    laterPage.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination records should be stable across pages",
    laterPage.pagination.records,
    firstPage.pagination.records,
  );
  TestValidator.equals(
    "pagination pages should be stable across pages",
    laterPage.pagination.pages,
    firstPage.pagination.pages,
  );
  TestValidator.predicate(
    "later page data should not exceed limit",
    laterPage.data.length <= laterPage.pagination.limit,
  );
  TestValidator.predicate(
    "first page should not contain duplicate category ids",
    new Set(firstPage.data.map((item) => item.id)).size ===
      firstPage.data.length,
  );
  TestValidator.predicate(
    "later page should not contain duplicate category ids",
    new Set(laterPage.data.map((item) => item.id)).size ===
      laterPage.data.length,
  );
  TestValidator.predicate(
    "later page should not overlap with first page",
    !laterPage.data.some((item) =>
      firstPage.data.some((prev) => prev.id === item.id),
    ),
  );
  const validateAscending = (values: string[]): boolean =>
    values.every(
      (value, index, array) => index === 0 || array[index - 1] <= value,
    );
  TestValidator.predicate(
    "first page should be ordered by name ascending",
    validateAscending(firstPage.data.map((item) => item.name)),
  );
  TestValidator.predicate(
    "later page should be ordered by name ascending",
    validateAscending(laterPage.data.map((item) => item.name)),
  );
}
