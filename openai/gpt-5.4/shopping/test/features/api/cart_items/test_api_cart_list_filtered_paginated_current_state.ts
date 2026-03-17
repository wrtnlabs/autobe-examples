import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartItem";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";

export async function test_api_cart_list_filtered_paginated_current_state(
  connection: api.IConnection,
): Promise<void> {
  const primaryCustomerConnection: api.IConnection = {
    host: connection.host,
  };
  const primaryCustomer = await authorize_customer_join(
    primaryCustomerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(primaryCustomer);
  const otherCustomerConnection: api.IConnection = {
    host: connection.host,
  };
  const otherCustomer = await authorize_customer_join(otherCustomerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(otherCustomer);
  const createdPrimaryItems: IShoppingMallCartItem[] =
    await ArrayUtil.asyncRepeat(5, async () => {
      const item =
        await generate_random_shopping_mall_customer_cart_items_create(
          primaryCustomerConnection,
          {},
        );
      typia.assert(item);
      return item;
    });
  TestValidator.predicate(
    "primary customer has multiple created cart items",
    createdPrimaryItems.length >= 2,
  );
  const otherCustomerItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      otherCustomerConnection,
      {},
    );
  typia.assert(otherCustomerItem);
  const unfilteredPage = 1;
  const unfilteredLimit = 3;
  const unfilteredSort: IShoppingMallCartItem.IRequest["sort"] = "-created_at";
  const unfiltered = await api.functional.shoppingMall.customer.cartItems.index(
    primaryCustomerConnection,
    {
      body: {
        page: unfilteredPage,
        limit: unfilteredLimit,
        sort: unfilteredSort,
      } satisfies IShoppingMallCartItem.IRequest,
    },
  );
  typia.assert(unfiltered);
  TestValidator.equals(
    "pagination current matches request",
    unfiltered.pagination.current,
    unfilteredPage,
  );
  TestValidator.equals(
    "pagination limit matches request",
    unfiltered.pagination.limit,
    unfilteredLimit,
  );
  TestValidator.predicate(
    "pagination data length does not exceed limit",
    unfiltered.data.length <= unfilteredLimit,
  );
  TestValidator.predicate(
    "pagination records covers data length",
    unfiltered.pagination.records >= unfiltered.data.length,
  );
  TestValidator.equals(
    "pagination pages is derived from records and limit",
    unfiltered.pagination.pages,
    Math.ceil(unfiltered.pagination.records / unfiltered.pagination.limit),
  );
  TestValidator.predicate(
    "ownership scoping excludes other customer item",
    unfiltered.data.every((item) => item.id !== otherCustomerItem.id),
  );
  TestValidator.predicate(
    "unfiltered data contains only created primary items",
    unfiltered.data.every((item) =>
      createdPrimaryItems.some((created) => created.id === item.id),
    ),
  );
  for (const item of unfiltered.data) {
    TestValidator.equals(
      `subtotal matches unit price times quantity for ${item.id}`,
      item.subtotal,
      item.unit_price * item.quantity,
    );
  }
  for (let i = 1; i < unfiltered.data.length; ++i) {
    TestValidator.predicate(
      `created_at descending order at index ${i}`,
      unfiltered.data[i - 1].created_at >= unfiltered.data[i].created_at,
    );
  }
  const scopedTarget = createdPrimaryItems[0];
  const byProductPage = 1;
  const byProductLimit = 10;
  const byProduct = await api.functional.shoppingMall.customer.cartItems.index(
    primaryCustomerConnection,
    {
      body: {
        shopping_mall_product_id: scopedTarget.product.id,
        sort: "created_at",
        page: byProductPage,
        limit: byProductLimit,
      } satisfies IShoppingMallCartItem.IRequest,
    },
  );
  typia.assert(byProduct);
  TestValidator.equals(
    "product filter pagination current matches request",
    byProduct.pagination.current,
    byProductPage,
  );
  TestValidator.equals(
    "product filter pagination limit matches request",
    byProduct.pagination.limit,
    byProductLimit,
  );
  TestValidator.predicate(
    "product filter returns matching product only",
    byProduct.data.every((item) => item.product.id === scopedTarget.product.id),
  );
  TestValidator.predicate(
    "product filter remains customer scoped",
    byProduct.data.every((item) => item.id !== otherCustomerItem.id),
  );
  const byVariantPage = 1;
  const byVariantLimit = 10;
  const byVariant = await api.functional.shoppingMall.customer.cartItems.index(
    primaryCustomerConnection,
    {
      body: {
        shopping_mall_product_variant_id: scopedTarget.productVariant.id,
        sort: "created_at",
        page: byVariantPage,
        limit: byVariantLimit,
      } satisfies IShoppingMallCartItem.IRequest,
    },
  );
  typia.assert(byVariant);
  TestValidator.equals(
    "variant filter pagination current matches request",
    byVariant.pagination.current,
    byVariantPage,
  );
  TestValidator.equals(
    "variant filter pagination limit matches request",
    byVariant.pagination.limit,
    byVariantLimit,
  );
  TestValidator.predicate(
    "variant filter returns matching variant only",
    byVariant.data.every(
      (item) => item.productVariant.id === scopedTarget.productVariant.id,
    ),
  );
  TestValidator.predicate(
    "variant filter remains customer scoped",
    byVariant.data.every((item) => item.id !== otherCustomerItem.id),
  );
  const unavailableSeed = createdPrimaryItems.find(
    (item) => item.availability === false,
  );
  const selectedAvailability = unavailableSeed?.availability ?? true;
  const byAvailabilityPage = 1;
  const byAvailabilityLimit = 10;
  const byAvailability =
    await api.functional.shoppingMall.customer.cartItems.index(
      primaryCustomerConnection,
      {
        body: {
          availability: selectedAvailability,
          sort: "-created_at",
          page: byAvailabilityPage,
          limit: byAvailabilityLimit,
        } satisfies IShoppingMallCartItem.IRequest,
      },
    );
  typia.assert(byAvailability);
  TestValidator.equals(
    "availability filter pagination current matches request",
    byAvailability.pagination.current,
    byAvailabilityPage,
  );
  TestValidator.equals(
    "availability filter pagination limit matches request",
    byAvailability.pagination.limit,
    byAvailabilityLimit,
  );
  TestValidator.predicate(
    "availability filter returns requested current availability only",
    byAvailability.data.every(
      (item) => item.availability === selectedAvailability,
    ),
  );
  TestValidator.predicate(
    "availability filter remains customer scoped",
    byAvailability.data.every((item) => item.id !== otherCustomerItem.id),
  );
  for (const item of byAvailability.data) {
    TestValidator.equals(
      `availability filtered subtotal matches formula for ${item.id}`,
      item.subtotal,
      item.unit_price * item.quantity,
    );
  }
  const combinedPage = 1;
  const combinedLimit = 2;
  const combined = await api.functional.shoppingMall.customer.cartItems.index(
    primaryCustomerConnection,
    {
      body: {
        availability: selectedAvailability,
        shopping_mall_product_id: scopedTarget.product.id,
        sort: "-created_at",
        page: combinedPage,
        limit: combinedLimit,
      } satisfies IShoppingMallCartItem.IRequest,
    },
  );
  typia.assert(combined);
  TestValidator.equals(
    "combined filter pagination current matches request",
    combined.pagination.current,
    combinedPage,
  );
  TestValidator.equals(
    "combined filter pagination limit matches request",
    combined.pagination.limit,
    combinedLimit,
  );
  TestValidator.predicate(
    "combined filter stays within limit",
    combined.data.length <= combinedLimit,
  );
  TestValidator.predicate(
    "combined filter records covers data length",
    combined.pagination.records >= combined.data.length,
  );
  TestValidator.equals(
    "combined filter pages is derived from records and limit",
    combined.pagination.pages,
    Math.ceil(combined.pagination.records / combined.pagination.limit),
  );
  TestValidator.predicate(
    "combined filter applies ownership and product and availability",
    combined.data.every(
      (item) =>
        item.id !== otherCustomerItem.id &&
        item.product.id === scopedTarget.product.id &&
        item.availability === selectedAvailability,
    ),
  );
  for (let i = 1; i < combined.data.length; ++i) {
    TestValidator.predicate(
      `combined filter created_at descending order at index ${i}`,
      combined.data[i - 1].created_at >= combined.data[i].created_at,
    );
  }
  for (const item of combined.data) {
    TestValidator.equals(
      `combined filter subtotal matches formula for ${item.id}`,
      item.subtotal,
      item.unit_price * item.quantity,
    );
  }
}
