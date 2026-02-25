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

/**
 * Test product update with category change functionality.
 * Verifies that category changes are properly validated and snapshots preserve previous category information.
 */
export async function test_api_product_update_category_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup administrator and create initial category
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };
  await authorize_administrator_join(adminConnection, {
    body: adminCredentials,
  });
  const initialCategory =
    await generate_random_ecommerce_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: "Initial Category " + RandomGenerator.alphabets(5),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceCategory.ICreate,
      },
    );
  typia.assert(initialCategory);
  // 2. Setup seller and create product with initial category
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    shop_name: RandomGenerator.name(),
    shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_image_url: typia.random<string & tags.Format<"uri">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IEcommerceSeller.IJoin;
  const seller = await authorize_seller_join(sellerConnection, {
    body: sellerCredentials,
  });
  typia.assert(seller);
  const initialProduct = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: initialCategory.id,
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(initialProduct);
  // 3. Create second category for the category change
  const secondCategory =
    await generate_random_ecommerce_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: "Second Category " + RandomGenerator.alphabets(5),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceCategory.ICreate,
      },
    );
  typia.assert(secondCategory);
  // 4. Update product with category change
  const updateData = {
    category_id: secondCategory.id,
  } satisfies IEcommerceProduct.IUpdate;
  const updatedProduct = await api.functional.ecommerce.seller.products.update(
    sellerConnection,
    {
      productId: initialProduct.id,
      body: updateData,
    },
  );
  typia.assert(updatedProduct);
  // 5. Validate category change
  TestValidator.equals(
    "product category should be updated",
    updatedProduct.category.id,
    secondCategory.id,
  );
  TestValidator.equals(
    "product name should remain unchanged",
    updatedProduct.name,
    initialProduct.name,
  );
  TestValidator.equals(
    "product description should remain unchanged",
    updatedProduct.description,
    initialProduct.description,
  );
  TestValidator.equals(
    "product base price should remain unchanged",
    updatedProduct.base_price,
    initialProduct.base_price,
  );
  // 6. Test invalid category ID rejection
  await TestValidator.error("should reject invalid category ID", async () => {
    await api.functional.ecommerce.seller.products.update(sellerConnection, {
      productId: initialProduct.id,
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceProduct.IUpdate,
    });
  });
}
