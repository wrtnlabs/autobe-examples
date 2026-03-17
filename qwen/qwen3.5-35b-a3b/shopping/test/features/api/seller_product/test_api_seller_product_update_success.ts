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

export async function test_api_seller_product_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration - create authenticated seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IEcommerceMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(seller);
  // 2. Create product through authenticated seller session
  const product: IEcommerceMallProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          category_id: typia.random<string & tags.Format<"uuid">>(),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        },
      },
    );
  typia.assert(product);
  // 3. Store original values for validation
  const originalName: string = product.name;
  const originalDescription: string = product.description;
  const originalSellerId: string = product.seller_id;
  const createdAt: string = product.created_at;
  // 4. Update product with partial fields (name and description only)
  const updatedName: string = RandomGenerator.paragraph({ sentences: 3 });
  const updatedDescription: string = RandomGenerator.content({ paragraphs: 3 });
  const updatedProduct: IEcommerceMallProduct =
    await api.functional.ecommerceMall.seller.products.update(
      sellerConnection,
      {
        productId: product.id,
        body: {
          name: updatedName,
          description: updatedDescription,
        } satisfies IEcommerceMallProduct.IUpdate,
      },
    );
  typia.assert(updatedProduct);
  // 5. Validate name is updated
  TestValidator.equals(
    "product name should be updated",
    updatedProduct.name,
    updatedName,
  );
  // 6. Validate description is updated
  TestValidator.equals(
    "product description should be updated",
    updatedProduct.description,
    updatedDescription,
  );
  // 7. Validate seller_id remains unchanged
  TestValidator.equals(
    "seller_id should remain unchanged",
    updatedProduct.seller_id,
    originalSellerId,
  );
  // 8. Validate updated_at timestamp is newer than created_at
  TestValidator.predicate(
    "updated_at should be newer than created_at",
    new Date(updatedProduct.updated_at).getTime() >
      new Date(createdAt).getTime(),
  );
  // 9. Validate product relationship seller matches authenticated seller
  TestValidator.equals(
    "product seller relationship should match authenticated seller",
    updatedProduct.seller.id,
    seller.id,
  );
  // 10. Validate seller email in relationship matches authenticated seller
  TestValidator.equals(
    "product seller email should match authenticated seller",
    updatedProduct.seller.email,
    seller.email,
  );
}
