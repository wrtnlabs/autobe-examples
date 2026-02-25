import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
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
import { generate_random_ecommerce_administrator_categories_create } from "../../../generate/generate_random_ecommerce_administrator_categories_create";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { prepare_random_ecommerce_category } from "../../../prepare/prepare_random_ecommerce_category";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";

export async function test_api_product_creation_unique_name_constraint(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Create category for products
  const category =
    await api.functional.ecommerce.administrator.categories.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceCategory.ICreate,
      },
    );
  typia.assert(category);
  // Create first seller account
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1 = await authorize_seller_join(seller1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(3),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller1);
  // Create second seller account
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2 = await authorize_seller_join(seller2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(3),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller2);
  // Define unique product name with proper length constraints
  const productName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 7,
  }).slice(0, 50);
  // Helper function to create product body
  const createProductBody = (name: string): IEcommerceProduct.ICreate => ({
    name: name satisfies string & tags.MinLength<3> & tags.MaxLength<200>,
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 10,
      wordMax: 20,
    }),
    base_price: typia.random<number & tags.Minimum<0>>(),
    category_id: category.id,
  });
  // Seller 1 creates first product
  const seller1Product1 = await api.functional.ecommerce.seller.products.create(
    seller1Connection,
    { body: createProductBody(productName) },
  );
  typia.assert(seller1Product1);
  // Helper function for duplicate product test
  const testDuplicateProduct = async (
    sellerConn: api.IConnection,
    productName: string,
  ) => {
    await TestValidator.error(
      "duplicate product name within same seller",
      async () => {
        await api.functional.ecommerce.seller.products.create(sellerConn, {
          body: createProductBody(productName),
        });
      },
    );
  };
  // Seller 1 attempts to create duplicate product (should fail)
  await testDuplicateProduct(seller1Connection, productName);
  // Seller 2 creates product with same name (should succeed - different seller)
  const seller2Product = await api.functional.ecommerce.seller.products.create(
    seller2Connection,
    { body: createProductBody(productName) },
  );
  typia.assert(seller2Product);
  // Validate that products from different sellers can have same name
  TestValidator.equals(
    "product names should match",
    seller1Product1.name,
    productName,
  );
  TestValidator.equals(
    "seller 2 product name should match",
    seller2Product.name,
    productName,
  );
  TestValidator.notEquals(
    "products should have different IDs",
    seller1Product1.id,
    seller2Product.id,
  );
  TestValidator.notEquals(
    "products should belong to different sellers",
    seller1Product1.seller.id,
    seller2Product.seller.id,
  );
  // Seller 1 attempts another duplicate (should still fail)
  await testDuplicateProduct(seller1Connection, productName);
}
