import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
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
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_seller_product_update_status_out_of_stock(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Join as a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuthorized);
  // Step 2: Create a product with the seller
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  const originalStatus = product.status;
  // Step 3: Update product status to out_of_stock
  const updatedProduct =
    await api.functional.ecommerceMall.seller.products.update(
      sellerConnection,
      {
        productId: product.id,
        body: {
          status: "out_of_stock",
        } satisfies IEcommerceMallProduct.IUpdate,
      },
    );
  typia.assert(updatedProduct);
  // Step 4: Validate status is updated
  TestValidator.equals(
    "product status updated to out_of_stock",
    updatedProduct.status,
    "out_of_stock",
  );
  TestValidator.notEquals(
    "status changed from original",
    updatedProduct.status,
    originalStatus,
  );
  TestValidator.equals("product id unchanged", updatedProduct.id, product.id);
  TestValidator.equals(
    "product name unchanged",
    updatedProduct.name,
    product.name,
  );
  TestValidator.equals(
    "product base_price unchanged",
    updatedProduct.base_price,
    product.base_price,
  );
  TestValidator.equals(
    "seller unchanged",
    updatedProduct.seller.id,
    product.seller.id,
  );
  TestValidator.equals(
    "category unchanged",
    updatedProduct.category.id,
    product.category.id,
  );
  // Validate product belongs to the same seller
  TestValidator.equals(
    "product seller matches authenticated seller",
    updatedProduct.seller.id,
    sellerAuthorized.id,
  );
  // Validate that the product is still accessible (not deleted)
  TestValidator.equals(
    "product not soft-deleted",
    updatedProduct.deleted_at,
    null,
  );
  // Validate updated_at timestamp changed
  TestValidator.notEquals(
    "updated_at timestamp changed",
    updatedProduct.updated_at,
    product.updated_at,
  );
}
