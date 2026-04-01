import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlist";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformWishlist";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_wishlist_browsing_pagination_search_sort(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const request: IMallPlatformWishlist.IRequest = {
    page: 1,
    limit: 10,
    search: RandomGenerator.alphabets(8),
    sort: RandomGenerator.alphabets(5),
  };
  const page = await api.functional.mallPlatform.customer.wishlists.index(
    customerConnection,
    { body: request },
  );
  typia.assert(page);
  TestValidator.equals("wishlist current page", page.pagination.current, 1);
  TestValidator.equals("wishlist page limit", page.pagination.limit, 10);
  TestValidator.predicate(
    "wishlist records are non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "wishlist pages are non-negative",
    page.pagination.pages >= 0,
  );
  TestValidator.equals(
    "wishlist page count matches records",
    page.pagination.pages,
    page.pagination.records === 0
      ? 0
      : Math.ceil(page.pagination.records / page.pagination.limit),
  );
  TestValidator.predicate(
    "wishlist response is stable for empty browsing",
    page.data.length <= page.pagination.limit,
  );
  if (page.data.length === 0) {
    TestValidator.equals("empty wishlist returns empty data", page.data, []);
    return;
  }
  TestValidator.predicate(
    "wishlist items do not exceed requested limit",
    page.data.length <= 10,
  );
  for (const item of page.data) {
    typia.assert(item);
    TestValidator.predicate("wishlist item has id", item.id.length > 0);
    TestValidator.predicate(
      "wishlist item customer has id",
      item.customer.id.length > 0,
    );
    TestValidator.predicate(
      "wishlist item customer email exists",
      item.customer.email.length > 0,
    );
    TestValidator.predicate(
      "wishlist item customer status exists",
      item.customer.status.length > 0,
    );
    TestValidator.predicate(
      "wishlist item createdAt exists",
      item.createdAt.length > 0,
    );
    TestValidator.predicate(
      "wishlist item updatedAt exists",
      item.updatedAt.length > 0,
    );
    TestValidator.equals(
      "wishlist item deletedAt is null or timestamp",
      item.deletedAt,
      item.deletedAt,
    );
  }
}
