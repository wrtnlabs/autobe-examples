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
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_wishlist_entry } from "../../../prepare/prepare_random_shopping_mall_wishlist_entry";

export async function test_api_wishlist_entries_excludes_removed_and_deleted_product_records(
  connection: api.IConnection,
): Promise<void> {
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(
    16,
  ) satisfies string as string;
  const sellerHref = typia.random<string & tags.Format<"uri">>();
  const sellerReferrer = typia.random<string & tags.Format<"uri">>();
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: sellerHref,
      referrer: sellerReferrer,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuthorized);
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLoggedIn = await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: sellerHref,
      referrer: sellerReferrer,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(sellerLoggedIn);
  const activeProduct =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerLoginConnection,
      {
        body: {
          shopping_mall_category_id: null,
          name: `active-${RandomGenerator.name()}`,
          description: RandomGenerator.content({ paragraphs: 1 }),
          base_price: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >() satisfies number as number,
          status: "active",
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(activeProduct);
  const removedProduct =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerLoginConnection,
      {
        body: {
          shopping_mall_category_id: null,
          name: `removed-${RandomGenerator.name()}`,
          description: RandomGenerator.content({ paragraphs: 1 }),
          base_price: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >() satisfies number as number,
          status: "active",
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(removedProduct);
  const deletedProduct =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerLoginConnection,
      {
        body: {
          shopping_mall_category_id: null,
          name: `deleted-${RandomGenerator.name()}`,
          description: RandomGenerator.content({ paragraphs: 1 }),
          base_price: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >() satisfies number as number,
          status: "active",
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(deletedProduct);
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(
    16,
  ) satisfies string as string;
  const customerHref = typia.random<string & tags.Format<"uri">>();
  const customerReferrer = typia.random<string & tags.Format<"uri">>();
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: customerHref,
      referrer: customerReferrer,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuthorized);
  const customerLoginConnection: api.IConnection = { host: connection.host };
  const customerLoggedIn = await authorize_customer_login(
    customerLoginConnection,
    {
      body: {
        email: customerEmail,
        password: customerPassword,
        href: customerHref,
        referrer: customerReferrer,
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallCustomer.ILogin,
    },
  );
  typia.assert(customerLoggedIn);
  const activeWishlistEntry =
    await generate_random_shopping_mall_customer_wishlist_entries_create(
      customerLoginConnection,
      {
        body: {
          shopping_mall_product_id: activeProduct.id,
        } satisfies IShoppingMallWishlistEntry.ICreate,
      },
    );
  typia.assert(activeWishlistEntry);
  const removedWishlistEntry =
    await generate_random_shopping_mall_customer_wishlist_entries_create(
      customerLoginConnection,
      {
        body: {
          shopping_mall_product_id: removedProduct.id,
        } satisfies IShoppingMallWishlistEntry.ICreate,
      },
    );
  typia.assert(removedWishlistEntry);
  const deletedProductWishlistEntry =
    await generate_random_shopping_mall_customer_wishlist_entries_create(
      customerLoginConnection,
      {
        body: {
          shopping_mall_product_id: deletedProduct.id,
        } satisfies IShoppingMallWishlistEntry.ICreate,
      },
    );
  typia.assert(deletedProductWishlistEntry);
  await api.functional.shoppingMall.customer.wishlistEntries.erase(
    customerLoginConnection,
    {
      wishlistEntryId: removedWishlistEntry.id,
    },
  );
  await api.functional.shoppingMall.seller.seller_products.erase(
    sellerLoginConnection,
    {
      productId: deletedProduct.id,
    },
  );
  const firstPage =
    await api.functional.shoppingMall.customer.wishlistEntries.index(
      customerLoginConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: "created_at_desc",
        } satisfies IShoppingMallWishlistEntry.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals(
    "remaining active wishlist record count",
    firstPage.pagination.records,
    1,
  );
  TestValidator.equals("first page data length", firstPage.data.length, 1);
  const remainingEntry = firstPage.data[0];
  TestValidator.equals(
    "active wishlist entry remains listed",
    remainingEntry.id,
    activeWishlistEntry.id,
  );
  TestValidator.equals(
    "active product remains listed",
    remainingEntry.product.id,
    activeProduct.id,
  );
  TestValidator.predicate(
    "removed wishlist entry excluded",
    firstPage.data.every((entry) => entry.id !== removedWishlistEntry.id),
  );
  TestValidator.predicate(
    "deleted product wishlist entry excluded",
    firstPage.data.every(
      (entry) => entry.id !== deletedProductWishlistEntry.id,
    ),
  );
  TestValidator.predicate(
    "deleted product not surfaced in active list",
    firstPage.data.every((entry) => entry.product.id !== deletedProduct.id),
  );
  const beyondPage =
    await api.functional.shoppingMall.customer.wishlistEntries.index(
      customerLoginConnection,
      {
        body: {
          page: 2,
          limit: 10,
          sort: "created_at_desc",
        } satisfies IShoppingMallWishlistEntry.IRequest,
      },
    );
  typia.assert(beyondPage);
  TestValidator.equals(
    "beyond page current page",
    beyondPage.pagination.current,
    2,
  );
  TestValidator.equals(
    "beyond page limit preserved",
    beyondPage.pagination.limit,
    10,
  );
  TestValidator.equals(
    "beyond page total records",
    beyondPage.pagination.records,
    1,
  );
  TestValidator.equals("beyond page empty data", beyondPage.data.length, 0);
  TestValidator.predicate(
    "beyond page pagination structure valid",
    beyondPage.pagination.pages >= 0 && beyondPage.pagination.records >= 0,
  );
}
