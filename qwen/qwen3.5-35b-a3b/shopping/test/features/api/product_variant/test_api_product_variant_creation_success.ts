import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_product_variant_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins the system
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Create seller-specific connection with token
  const sellerAuthenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: sellerAuth.token.access,
    },
  };
  // 3. Create product variant (product ID assumed to exist from external setup)
  // Using a random UUID as the existing product ID since product creation API is not available
  const productId = typia.random<string & tags.Format<"uuid">>();
  const variantInput = {
    sku_code: RandomGenerator.alphaNumeric(10).toUpperCase(),
    option_values: {
      size: RandomGenerator.pick(["Small", "Medium", "Large", "XL"]),
      color: RandomGenerator.pick(["Red", "Blue", "Green", "Black"]),
    },
    stock_quantity: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<9999>
    >(),
    price_override: typia.random<number | null>(),
  };
  const variant =
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerAuthenticatedConnection,
      {
        productId: productId,
        body: variantInput,
      },
    );
  typia.assert(variant);
  // 4. Validate variant creation
  TestValidator.equals(
    "variant has unique id",
    variant.id,
    typia.assert<string & tags.Format<"uuid">>(variant.id),
  );
  TestValidator.equals(
    "sku_code matches input",
    variant.skuCode,
    variantInput.sku_code,
  );
  TestValidator.equals(
    "option_values matches input",
    variant.optionValues,
    variantInput.option_values,
  );
  TestValidator.equals(
    "stock_quantity matches input",
    variant.stockQuantity,
    variantInput.stock_quantity,
  );
  TestValidator.equals(
    "price_override matches input",
    variant.priceOverride,
    variantInput.price_override,
  );
  TestValidator.predicate("variant is active", variant.isActive === true);
  TestValidator.predicate(
    "created_at is valid date-time",
    new Date(variant.createdAt).getTime() > 0,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    new Date(variant.updatedAt).getTime() > 0,
  );
}
