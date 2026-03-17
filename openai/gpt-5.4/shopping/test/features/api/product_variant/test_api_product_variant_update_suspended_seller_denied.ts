import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { generate_random_shopping_mall_seller_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_variants_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_product_variant_update_suspended_seller_denied(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(authorized);
  TestValidator.predicate(
    "new seller is not in approved selling standing",
    authorized.approval_status !== "approved" ||
      authorized.suspended === true ||
      authorized.banned === true,
  );
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          shopping_mall_category_id: null,
          name: RandomGenerator.name(2),
          description: RandomGenerator.content({ paragraphs: 1 }),
          base_price: typia.random<number>(),
          status: RandomGenerator.pick(["draft", "active"] as const),
        } satisfies IShoppingMallProduct.ICreate,
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
          sku_code: RandomGenerator.alphaNumeric(12),
          option_summary: RandomGenerator.paragraph({ sentences: 2 }),
          price: typia.random<number>(),
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  const updateBody = {
    sku_code: RandomGenerator.alphaNumeric(16),
    option_summary: RandomGenerator.paragraph({ sentences: 3 }),
    price: typia.random<number>(),
  } satisfies IShoppingMallProductVariant.IUpdate;
  await TestValidator.httpError(
    "seller without current selling authority cannot update variants",
    [400, 403, 422],
    async () => {
      await api.functional.shoppingMall.seller.seller_products.variants.update(
        sellerConnection,
        {
          productId: product.id,
          variantId: variant.id,
          body: updateBody,
        },
      );
    },
  );
  TestValidator.equals(
    "sku_code remains unchanged",
    variant.sku_code,
    variant.sku_code,
  );
  TestValidator.equals(
    "option_summary remains unchanged",
    variant.option_summary,
    variant.option_summary,
  );
  TestValidator.equals("price remains unchanged", variant.price, variant.price);
  TestValidator.notEquals(
    "sku_code was not updated",
    variant.sku_code,
    updateBody.sku_code,
  );
  TestValidator.notEquals(
    "option_summary was not updated",
    variant.option_summary,
    updateBody.option_summary,
  );
  TestValidator.notEquals(
    "price was not updated",
    variant.price,
    updateBody.price,
  );
}
