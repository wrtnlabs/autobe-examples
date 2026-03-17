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

export async function test_api_cart_list_customer_ownership_isolation(
  connection: api.IConnection,
): Promise<void> {
  const firstCustomerConnection: api.IConnection = { host: connection.host };
  const firstAuthorized = await authorize_customer_join(
    firstCustomerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(firstAuthorized);
  const firstCartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      firstCustomerConnection,
      {},
    );
  typia.assert(firstCartItem);
  const secondCustomerConnection: api.IConnection = { host: connection.host };
  const secondAuthorized = await authorize_customer_join(
    secondCustomerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(secondAuthorized);
  const secondCartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      secondCustomerConnection,
      {},
    );
  typia.assert(secondCartItem);
  const request = {
    shopping_mall_product_id: firstCartItem.product.id,
    shopping_mall_product_variant_id: firstCartItem.productVariant.id,
    page: 1 satisfies number as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IShoppingMallCartItem.IRequest;
  const page = await api.functional.shoppingMall.customer.cartItems.index(
    firstCustomerConnection,
    {
      body: request,
    },
  );
  typia.assert(page);
  TestValidator.equals(
    "first customer cart list has one item",
    page.data.length,
    1,
  );
  TestValidator.equals(
    "pagination current matches request",
    page.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "pagination limit matches request",
    page.pagination.limit,
    request.limit,
  );
  TestValidator.predicate(
    "pagination records is positive",
    page.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination pages is positive",
    page.pagination.pages > 0,
  );
  const listed = page.data[0];
  TestValidator.predicate("listed cart item exists", listed !== undefined);
  typia.assert(listed);
  TestValidator.equals(
    "listed cart item matches first cart item id",
    listed.id,
    firstCartItem.id,
  );
  TestValidator.equals(
    "listed product belongs to first customer's cart item",
    listed.product.id,
    firstCartItem.product.id,
  );
  TestValidator.equals(
    "listed variant belongs to first customer's cart item",
    listed.productVariant.id,
    firstCartItem.productVariant.id,
  );
  TestValidator.equals(
    "listed quantity matches first cart item",
    listed.quantity,
    firstCartItem.quantity,
  );
  TestValidator.equals(
    "listed unit price matches first cart item",
    listed.unit_price,
    firstCartItem.unit_price,
  );
  TestValidator.equals(
    "listed subtotal matches first cart item",
    listed.subtotal,
    firstCartItem.subtotal,
  );
  TestValidator.predicate(
    "second customer's cart item is not exposed",
    !ArrayUtil.has(page.data, (item) => item.id === secondCartItem.id),
  );
}
