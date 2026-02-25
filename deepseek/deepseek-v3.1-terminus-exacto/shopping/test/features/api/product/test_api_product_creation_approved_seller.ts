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

export async function test_api_product_creation_approved_seller(
  connection: api.IConnection,
): Promise<void> {
  // Admin setup - create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin1234",
    } satisfies IEcommerceAdministrator.IJoin,
  });
  const category =
    await api.functional.ecommerce.administrator.categories.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommerceCategory.ICreate,
      },
    );
  typia.assert(category);
  // Seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "seller1234",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: "https://example.com",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // Create product input data
  const productInput = {
    name: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    base_price: 1000 + Math.floor(Math.random() * 9000), // Simple positive number
    category_id: category.id,
  } satisfies IEcommerceProduct.ICreate;
  // Seller creates product
  const product = await api.functional.ecommerce.seller.products.create(
    sellerConnection,
    {
      body: productInput,
    },
  );
  typia.assert(product);
  // Validate business logic (not type validation)
  TestValidator.equals(
    "product name matches input",
    product.name,
    productInput.name,
  );
  TestValidator.equals(
    "product description matches",
    product.description,
    productInput.description,
  );
  TestValidator.equals(
    "product base price matches",
    product.base_price,
    productInput.base_price,
  );
  TestValidator.equals(
    "product category matches",
    product.category.id,
    category.id,
  );
  TestValidator.equals("seller attribution", product.seller.id, seller.id);
  TestValidator.predicate(
    "product has positive base price",
    product.base_price > 0,
  );
}
