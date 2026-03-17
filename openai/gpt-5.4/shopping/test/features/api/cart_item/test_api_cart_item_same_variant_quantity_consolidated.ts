import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_cart_item_same_variant_quantity_consolidated(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  const firstQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();
  const firstCartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          quantity: firstQuantity,
        },
      },
    );
  typia.assert(firstCartItem);
  const secondQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();
  const secondCartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          shopping_mall_product_id: firstCartItem.product.id,
          shopping_mall_product_variant_id: firstCartItem.productVariant.id,
          quantity: secondQuantity,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(secondCartItem);
  TestValidator.equals(
    "same cart line is reused for same variant",
    secondCartItem.id,
    firstCartItem.id,
  );
  TestValidator.equals(
    "product id is preserved",
    secondCartItem.product.id,
    firstCartItem.product.id,
  );
  TestValidator.equals(
    "product variant id is preserved",
    secondCartItem.productVariant.id,
    firstCartItem.productVariant.id,
  );
  TestValidator.equals(
    "quantity is consolidated by addition",
    secondCartItem.quantity,
    (firstCartItem.quantity + secondQuantity) satisfies number as number,
  );
  TestValidator.notEquals(
    "updated_at changes after second add",
    firstCartItem.updated_at,
    secondCartItem.updated_at,
  );
  TestValidator.equals(
    "created_at is preserved on consolidated line",
    secondCartItem.created_at,
    firstCartItem.created_at,
  );
  TestValidator.equals(
    "deleted_at remains null",
    secondCartItem.deleted_at,
    null,
  );
  TestValidator.equals(
    "product name remains associated with same summary",
    secondCartItem.product.name,
    firstCartItem.product.name,
  );
  TestValidator.equals(
    "product variant option summary remains associated",
    secondCartItem.productVariant.option_summary,
    firstCartItem.productVariant.option_summary,
  );
  TestValidator.equals(
    "subtotal is recalculated from consolidated quantity and unit price",
    secondCartItem.subtotal,
    secondCartItem.unit_price * secondCartItem.quantity,
  );
  TestValidator.predicate(
    "cart line remains available after consolidation",
    secondCartItem.availability,
  );
}
