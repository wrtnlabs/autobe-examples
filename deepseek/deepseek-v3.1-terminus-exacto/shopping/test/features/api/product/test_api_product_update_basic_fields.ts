import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";

/**
 * Test product update basic fields functionality.
 * 1. Register and authenticate a seller
 * 2. Create a product owned by the seller
 * 3. Update the product's name, description, and base price
 * 4. Verify the updates are reflected correctly
 * 5. Test ownership validation by attempting to update another seller's product
 */
export async function test_api_product_update_basic_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Create a product for the seller to update
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Update the product's basic fields
  const updatedProduct = await api.functional.ecommerce.seller.products.update(
    sellerConnection,
    {
      productId: product.id,
      body: {
        name: "Updated " + RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 6 }),
        base_price: typia.random<
          number &
            tags.Type<"uint32"> &
            tags.Minimum<2000> &
            tags.Maximum<50000>
        >(),
      } satisfies IEcommerceProduct.IUpdate,
    },
  );
  typia.assert(updatedProduct);
  // 4. Verify the updates
  TestValidator.equals(
    "product ID remains the same",
    updatedProduct.id,
    product.id,
  );
  TestValidator.notEquals(
    "name should be updated",
    updatedProduct.name,
    product.name,
  );
  TestValidator.notEquals(
    "description should be updated",
    updatedProduct.description,
    product.description,
  );
  TestValidator.notEquals(
    "base price should be updated",
    updatedProduct.base_price,
    product.base_price,
  );
  TestValidator.equals(
    "seller remains the same",
    updatedProduct.seller.id,
    seller.id,
  );
  TestValidator.equals(
    "category remains the same",
    updatedProduct.category.id,
    product.category.id,
  );
  TestValidator.predicate(
    "updated_at should be after created_at",
    new Date(updatedProduct.updated_at) > new Date(product.created_at),
  );
  // 5. Test ownership validation
  const anotherSellerConnection: api.IConnection = { host: connection.host };
  const anotherSeller = await authorize_seller_join(anotherSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(anotherSeller);
  // Attempt to update the first seller's product with the second seller
  await TestValidator.error(
    "should not allow updating another seller's product",
    async () => {
      await api.functional.ecommerce.seller.products.update(
        anotherSellerConnection,
        {
          productId: product.id,
          body: {
            name: "Unauthorized Update",
          } satisfies IEcommerceProduct.IUpdate,
        },
      );
    },
  );
}
