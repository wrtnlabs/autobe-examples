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

export async function test_api_cart_list_consolidated_variant_line(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  const firstCartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(firstCartItem);
  const additionalQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >() satisfies number as number;
  const secondCartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          shopping_mall_product_id: firstCartItem.product.id,
          shopping_mall_product_variant_id: firstCartItem.productVariant.id,
          quantity: additionalQuantity,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(secondCartItem);
  const pageRequest = {
    shopping_mall_product_id: firstCartItem.product.id,
    shopping_mall_product_variant_id: firstCartItem.productVariant.id,
    page: 1,
    limit: 10,
    sort: "updated_at",
  } satisfies IShoppingMallCartItem.IRequest;
  const page = await api.functional.shoppingMall.customer.cartItems.index(
    customerConnection,
    {
      body: pageRequest,
    },
  );
  typia.assert(page);
  const matching = page.data.filter(
    (item) =>
      item.product.id === firstCartItem.product.id &&
      item.productVariant.id === firstCartItem.productVariant.id,
  );
  TestValidator.equals(
    "filtered page has one consolidated line",
    matching.length,
    1,
  );
  const line = matching[0]!;
  TestValidator.equals(
    "product matches selected product",
    line.product.id,
    firstCartItem.product.id,
  );
  TestValidator.equals(
    "variant matches selected variant",
    line.productVariant.id,
    firstCartItem.productVariant.id,
  );
  TestValidator.equals(
    "quantity is consolidated",
    line.quantity,
    secondCartItem.quantity,
  );
  TestValidator.equals(
    "availability is exposed on consolidated line",
    line.availability,
    secondCartItem.availability,
  );
  TestValidator.equals(
    "subtotal equals unit price multiplied by quantity",
    line.subtotal,
    line.unit_price * line.quantity,
  );
  TestValidator.equals(
    "requested current page reflected",
    page.pagination.current,
    1,
  );
  TestValidator.equals("requested limit reflected", page.pagination.limit, 10);
  TestValidator.predicate(
    "page has at least one record",
    page.pagination.records >= 1,
  );
  TestValidator.predicate(
    "page has at least one page",
    page.pagination.pages >= 1,
  );
}
