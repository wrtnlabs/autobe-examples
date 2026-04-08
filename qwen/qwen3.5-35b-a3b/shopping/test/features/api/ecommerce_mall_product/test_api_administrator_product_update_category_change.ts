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

export async function test_api_administrator_product_update_category_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    },
  });
  // 2. Create Electronics category
  const electronicsCategory: IEcommerceMallCategory =
    await generate_random_ecommerce_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: "Electronics",
          description: "Electronic devices and accessories",
        },
      },
    );
  typia.assert(electronicsCategory);
  // 3. Create Accessories category
  const accessoriesCategory: IEcommerceMallCategory =
    await generate_random_ecommerce_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: "Accessories",
          description: "Product accessories and add-ons",
        },
      },
    );
  typia.assert(accessoriesCategory);
  // 4. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 5. Create product in Electronics category
  const productName = RandomGenerator.name(3);
  const productDescription = RandomGenerator.paragraph({ sentences: 3 });
  const product: IEcommerceMallProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          name: productName,
          description: productDescription,
          category_id: electronicsCategory.id,
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        },
      },
    );
  typia.assert(product);
  // 6. Verify product initially in Electronics category
  TestValidator.equals(
    "product initially in Electronics",
    product.category.id,
    electronicsCategory.id,
  );
  // 7. Admin update product to Accessories category
  const updatedProduct: IEcommerceMallProduct =
    await api.functional.ecommerceMall.administrator.products.update(
      adminConnection,
      {
        productId: product.id,
        body: {
          category_id: accessoriesCategory.id,
        },
      },
    );
  typia.assert(updatedProduct);
  // 8. Verify category changed to Accessories
  TestValidator.equals(
    "product moved to Accessories",
    updatedProduct.category.id,
    accessoriesCategory.id,
  );
  // 9. Verify product.name unchanged
  TestValidator.equals(
    "product name unchanged",
    updatedProduct.name,
    productName,
  );
  // 10. Verify product.description unchanged
  TestValidator.equals(
    "product description unchanged",
    updatedProduct.description,
    productDescription,
  );
  // 11. Verify product.base_price unchanged
  TestValidator.equals(
    "product base_price unchanged",
    updatedProduct.base_price,
    product.base_price,
  );
  // 12. Verify product.seller unchanged
  TestValidator.equals(
    "product seller unchanged",
    updatedProduct.seller.id,
    product.seller.id,
  );
  // 13. Verify product.images preserved
  TestValidator.equals(
    "product images count preserved",
    updatedProduct.images.length,
    product.images.length,
  );
  // 14. Verify product.variants preserved
  TestValidator.equals(
    "product variants count preserved",
    updatedProduct.variants.length,
    product.variants.length,
  );
}
