import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_administrator_categories_create } from "../../../generate/generate_random_ecommerce_mall_administrator_categories_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_seller_product_update_success(
  connection: api.IConnection,
): Promise<void> {
  const sellerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IEcommerceMallSeller.IJoin;
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: sellerCredentials,
  });
  typia.assert(seller);
  const adminCredentials = {
    display_name: RandomGenerator.name(2),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    grade: "regular" as const,
  } satisfies IEcommerceMallAdministrator.IJoin;
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: adminCredentials,
  });
  typia.assert(admin);
  const category =
    await generate_random_ecommerce_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(category);
  const productInput = {
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    category_id: category.id,
    base_price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<100000>
    >(),
  } satisfies IEcommerceMallProduct.ICreate;
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: productInput,
    },
  );
  typia.assert(product);
  const updatedName = RandomGenerator.name(3);
  const updatedDescription = RandomGenerator.paragraph({ sentences: 5 });
  const updatedBasePrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<100000>
  >();
  const updatedProduct =
    await api.functional.ecommerceMall.seller.products.update(
      sellerConnection,
      {
        productId: product.id,
        body: {
          name: updatedName,
          description: updatedDescription,
          base_price: updatedBasePrice,
        } satisfies IEcommerceMallProduct.IUpdate,
      },
    );
  typia.assert(updatedProduct);
  TestValidator.equals(
    "product name updated",
    updatedProduct.name,
    updatedName,
  );
  TestValidator.equals(
    "product description updated",
    updatedProduct.description,
    updatedDescription,
  );
  TestValidator.equals(
    "product base price updated",
    updatedProduct.base_price,
    updatedBasePrice,
  );
  TestValidator.equals(
    "product category unchanged",
    updatedProduct.category.id,
    category.id,
  );
  TestValidator.notEquals(
    "product name changed",
    product.name,
    updatedProduct.name,
  );
  TestValidator.notEquals(
    "product description changed",
    product.description,
    updatedProduct.description,
  );
  TestValidator.notEquals(
    "product base price changed",
    product.base_price,
    updatedProduct.base_price,
  );
}