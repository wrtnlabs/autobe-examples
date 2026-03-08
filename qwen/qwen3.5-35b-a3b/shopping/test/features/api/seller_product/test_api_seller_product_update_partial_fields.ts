import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
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

export async function test_api_seller_product_update_partial_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
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
  // 2. Create initial product with all fields
  const initialProduct =
    await api.functional.ecommerceMall.seller.products.update(
      sellerConnection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          category_id: typia.random<string & tags.Format<"uuid">>(),
          is_active: true,
        },
      },
    );
  typia.assert(initialProduct);
  // 3. Capture baseline values
  const originalName = initialProduct.name;
  const originalDescription = initialProduct.description;
  const originalPrice = initialProduct.base_price;
  const originalIsActive = initialProduct.is_active;
  const originalCreatedAt = initialProduct.created_at;
  const originalUpdatedAt = initialProduct.updated_at;
  // 4. Partial update - change only name
  const newName = RandomGenerator.paragraph({ sentences: 2 });
  const updatedProduct =
    await api.functional.ecommerceMall.seller.products.update(
      sellerConnection,
      {
        productId: initialProduct.id,
        body: {
          name: newName,
        },
      },
    );
  typia.assert(updatedProduct);
  // 5. Verify name was updated
  TestValidator.equals("name updated", updatedProduct.name, newName);
  // 6. Verify other fields unchanged
  TestValidator.equals(
    "description unchanged",
    updatedProduct.description,
    originalDescription,
  );
  TestValidator.equals(
    "base_price unchanged",
    updatedProduct.base_price,
    originalPrice,
  );
  TestValidator.equals(
    "is_active unchanged",
    updatedProduct.is_active,
    originalIsActive,
  );
  // 7. Verify updated_at timestamp changed
  TestValidator.notEquals(
    "updated_at changed",
    originalUpdatedAt,
    updatedProduct.updated_at,
  );
  // 8. Create another product for second update test
  const product2 = await api.functional.ecommerceMall.seller.products.update(
    sellerConnection,
    {
      productId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        is_active: false,
      },
    },
  );
  typia.assert(product2);
  // 9. Partial update - change base_price
  const newPrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000>
  >();
  const updatedProduct2 =
    await api.functional.ecommerceMall.seller.products.update(
      sellerConnection,
      {
        productId: product2.id,
        body: {
          base_price: newPrice,
        },
      },
    );
  typia.assert(updatedProduct2);
  // 10. Verify price updated, other fields unchanged
  TestValidator.equals("price updated", updatedProduct2.base_price, newPrice);
  TestValidator.equals(
    "name unchanged after price update",
    updatedProduct2.name,
    product2.name,
  );
  TestValidator.equals(
    "description unchanged",
    updatedProduct2.description,
    product2.description,
  );
  TestValidator.equals(
    "is_active unchanged",
    updatedProduct2.is_active,
    product2.is_active,
  );
}