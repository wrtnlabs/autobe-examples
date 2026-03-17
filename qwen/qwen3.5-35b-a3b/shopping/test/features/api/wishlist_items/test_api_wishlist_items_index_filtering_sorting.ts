import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallWishlistItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_wishlist_items_index_filtering_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Test default query (no filters)
  const defaultResponse =
    await api.functional.ecommerceMall.customer.wishlist_items.index(
      customerConnection,
      {
        body: {},
      },
    );
  typia.assert(defaultResponse);
  TestValidator.equals(
    "has pagination",
    defaultResponse.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "data is array",
    Array.isArray(defaultResponse.data),
    true,
  );
  TestValidator.equals(
    "records count matches",
    defaultResponse.pagination.records,
    defaultResponse.data.length,
  );
  // 3. Test with limit parameter
  const limitedResponse =
    await api.functional.ecommerceMall.customer.wishlist_items.index(
      customerConnection,
      {
        body: {
          limit: 10,
        },
      },
    );
  typia.assert(limitedResponse);
  TestValidator.equals(
    "pagination limit 10",
    limitedResponse.pagination.limit,
    10,
  );
  // 4. Test with search filter
  const searchFilter = RandomGenerator.alphaNumeric(8);
  const searchResponse =
    await api.functional.ecommerceMall.customer.wishlist_items.index(
      customerConnection,
      {
        body: {
          search: searchFilter,
        },
      },
    );
  typia.assert(searchResponse);
  TestValidator.equals(
    "search pagination limit",
    searchResponse.pagination.limit,
    100,
  );
  // 5. Test with min_price filter
  const minPrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<0>
  >();
  const minPriceResponse =
    await api.functional.ecommerceMall.customer.wishlist_items.index(
      customerConnection,
      {
        body: {
          min_price: minPrice,
        },
      },
    );
  typia.assert(minPriceResponse);
  // 6. Test with max_price filter
  const maxPrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<1000000>
  >();
  const maxPriceResponse =
    await api.functional.ecommerceMall.customer.wishlist_items.index(
      customerConnection,
      {
        body: {
          max_price: maxPrice,
        },
      },
    );
  typia.assert(maxPriceResponse);
  // 7. Test with min_price and max_price filter
  const combinedFilterResponse =
    await api.functional.ecommerceMall.customer.wishlist_items.index(
      customerConnection,
      {
        body: {
          min_price: 1000,
          max_price: 50000,
        },
      },
    );
  typia.assert(combinedFilterResponse);
  // 8. Test with sort by name ascending
  const nameAscResponse =
    await api.functional.ecommerceMall.customer.wishlist_items.index(
      customerConnection,
      {
        body: {
          sort: "name",
          direction: "asc",
        },
      },
    );
  typia.assert(nameAscResponse);
  // 9. Test with sort by name descending
  const nameDescResponse =
    await api.functional.ecommerceMall.customer.wishlist_items.index(
      customerConnection,
      {
        body: {
          sort: "name",
          direction: "desc",
        },
      },
    );
  typia.assert(nameDescResponse);
  // 10. Test with sort by base_price ascending
  const priceAscResponse =
    await api.functional.ecommerceMall.customer.wishlist_items.index(
      customerConnection,
      {
        body: {
          sort: "base_price",
          direction: "asc",
        },
      },
    );
  typia.assert(priceAscResponse);
  // 11. Test with sort by base_price descending
  const priceDescResponse =
    await api.functional.ecommerceMall.customer.wishlist_items.index(
      customerConnection,
      {
        body: {
          sort: "base_price",
          direction: "desc",
        },
      },
    );
  typia.assert(priceDescResponse);
  // 12. Test with sort by created_at ascending
  const createdAtAscResponse =
    await api.functional.ecommerceMall.customer.wishlist_items.index(
      customerConnection,
      {
        body: {
          sort: "created_at",
          direction: "asc",
        },
      },
    );
  typia.assert(createdAtAscResponse);
  // 13. Test pagination with page parameter
  const pageResponse =
    await api.functional.ecommerceMall.customer.wishlist_items.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 5,
        },
      },
    );
  typia.assert(pageResponse);
  TestValidator.equals("page is 1", pageResponse.pagination.current, 1);
  // 14. Test pagination with page 2
  const page2Response =
    await api.functional.ecommerceMall.customer.wishlist_items.index(
      customerConnection,
      {
        body: {
          page: 2,
          limit: 5,
        },
      },
    );
  typia.assert(page2Response);
  TestValidator.equals("page is 2", page2Response.pagination.current, 2);
  // 15. Validate data isolation (all items belong to customer)
  for (const item of defaultResponse.data) {
    TestValidator.equals(
      "item belongs to customer",
      item.customer_id,
      customer.id,
    );
    typia.assert(item);
  }
  // 16. Validate item structure
  if (defaultResponse.data.length > 0) {
    const firstItem = defaultResponse.data[0];
    TestValidator.equals("has valid id", firstItem.id !== undefined, true);
    TestValidator.equals("has product", firstItem.product !== undefined, true);
    TestValidator.equals(
      "has product_id",
      firstItem.product_id !== undefined,
      true,
    );
    TestValidator.equals(
      "has created_at",
      firstItem.created_at !== undefined,
      true,
    );
    typia.assert(firstItem.product);
  }
  // 17. Test cursor-based pagination (if items exist)
  if (defaultResponse.data.length > 0) {
    const lastItem = defaultResponse.data[defaultResponse.data.length - 1];
    const cursor = lastItem.id;
    const cursorResponse =
      await api.functional.ecommerceMall.customer.wishlist_items.index(
        customerConnection,
        {
          body: {
            cursor: cursor,
            limit: 10,
          },
        },
      );
    typia.assert(cursorResponse);
    TestValidator.equals(
      "cursor pagination has limit",
      cursorResponse.pagination.limit,
      10,
    );
  }
}
