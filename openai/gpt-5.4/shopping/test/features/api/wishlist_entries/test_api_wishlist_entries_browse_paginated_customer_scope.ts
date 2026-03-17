import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlistEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlistEntry";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallWishlistEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistEntry";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_wishlist_entries_create } from "../../../generate/generate_random_shopping_mall_customer_wishlist_entries_create";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { generate_random_shopping_mall_seller_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_variants_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_wishlist_entry } from "../../../prepare/prepare_random_shopping_mall_wishlist_entry";

export async function test_api_wishlist_entries_browse_paginated_customer_scope(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerPassword = typia.random<string & tags.Format<"password">>();
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerAuthorized);
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLoggedIn = await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(sellerLoggedIn);
  const products = await ArrayUtil.asyncRepeat(3, async (index) => {
    const product =
      await generate_random_shopping_mall_seller_seller_products_create(
        sellerConnection,
        {
          body: {
            shopping_mall_category_id: null,
            name: `${RandomGenerator.name()}-${index}-${RandomGenerator.alphabets(4)}`,
            description: RandomGenerator.content({ paragraphs: 2 }),
            base_price: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<1000>
            >() satisfies number as number,
            status: "active",
          },
        },
      );
    typia.assert(product);
    const variant =
      await generate_random_shopping_mall_seller_seller_products_variants_create(
        sellerConnection,
        {
          params: {
            productId: product.id,
          },
          body: {
            sku_code: `SKU-${index}-${RandomGenerator.alphaNumeric(8)}`,
            option_summary: `${RandomGenerator.name(1)} ${RandomGenerator.alphabets(3)}`,
            price: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<1000>
            >() satisfies number as number,
          },
        },
      );
    typia.assert(variant);
    TestValidator.equals(
      "variant product matches parent product",
      variant.product.id,
      product.id,
    );
    return product;
  });
  const customerConnection: api.IConnection = { host: connection.host };
  const customerPassword = typia.random<string & tags.Format<"password">>();
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customerAuthorized);
  const customerLoginConnection: api.IConnection = { host: connection.host };
  const customerLoggedIn = await authorize_customer_login(
    customerLoginConnection,
    {
      body: {
        email: customerEmail,
        password: customerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallCustomer.ILogin,
    },
  );
  typia.assert(customerLoggedIn);
  const createdEntries = await ArrayUtil.asyncMap(products, async (product) => {
    const entry =
      await generate_random_shopping_mall_customer_wishlist_entries_create(
        customerConnection,
        {
          body: {
            shopping_mall_product_id: product.id,
          },
        },
      );
    typia.assert(entry);
    TestValidator.equals(
      "wishlist entry product matches setup product",
      entry.product.id,
      product.id,
    );
    return entry;
  });
  const request = {
    page: 1,
    limit: 2,
    sort: "created_at_desc",
  } satisfies IShoppingMallWishlistEntry.IRequest;
  const firstPage =
    await api.functional.shoppingMall.customer.wishlistEntries.index(
      customerConnection,
      {
        body: request,
      },
    );
  typia.assert(firstPage);
  const secondRead =
    await api.functional.shoppingMall.customer.wishlistEntries.index(
      customerConnection,
      {
        body: request,
      },
    );
  typia.assert(secondRead);
  TestValidator.equals(
    "current page matches request",
    firstPage.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "page limit matches request",
    firstPage.pagination.limit,
    request.limit,
  );
  TestValidator.equals(
    "record count equals created wishlist entries",
    firstPage.pagination.records,
    createdEntries.length,
  );
  TestValidator.equals(
    "total pages derived from records and limit",
    firstPage.pagination.pages,
    Math.ceil(createdEntries.length / request.limit),
  );
  TestValidator.equals(
    "repeated browse keeps same total record count",
    secondRead.pagination.records,
    firstPage.pagination.records,
  );
  TestValidator.equals(
    "repeated browse keeps same total pages",
    secondRead.pagination.pages,
    firstPage.pagination.pages,
  );
  TestValidator.predicate(
    "first page size does not exceed requested limit",
    firstPage.data.length <= request.limit,
  );
  TestValidator.equals(
    "repeated browse keeps same first-page size",
    secondRead.data.length,
    firstPage.data.length,
  );
  const createdEntryIds = createdEntries.map((entry) => entry.id);
  const createdProductIds = createdEntries.map((entry) => entry.product.id);
  firstPage.data.forEach((entry, index) => {
    TestValidator.predicate(
      `wishlist entry ${index} belongs to setup set`,
      createdEntryIds.includes(entry.id),
    );
    TestValidator.predicate(
      `wishlist entry ${index} product belongs to customer wishlist setup`,
      createdProductIds.includes(entry.product.id),
    );
    if (index > 0) {
      TestValidator.predicate(
        `created_at desc ordering at index ${index}`,
        firstPage.data[index - 1].created_at >= entry.created_at,
      );
    }
  });
  TestValidator.equals(
    "repeated browse keeps same first page ids",
    secondRead.data.map((entry) => entry.id),
    firstPage.data.map((entry) => entry.id),
  );
}
