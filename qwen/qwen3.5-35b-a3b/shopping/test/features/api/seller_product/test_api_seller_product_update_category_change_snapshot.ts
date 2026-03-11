import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
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

// This test verifies that category changes trigger immutable snapshot creation
// Snapshots preserve the old category_id for audit and dispute resolution (section 974)
export async function test_api_seller_product_update_category_change_snapshot(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup and authentication using utility function
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuth: IEcommerceMallSeller.IAuthorized =
    await authorize_seller_join(sellerJoinConnection, {
      body: typia.random<IEcommerceMallSeller.IJoin>(),
    });
  typia.assert(sellerAuth);
  // 2. Create seller-specific connection for product operations
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers ??= {};
  sellerConnection.headers.Authorization = sellerAuth.token.access;
  // 3. Generate UUIDs for both categories
  const category1Id = typia.random<string & tags.Format<"uuid">>();
  const category2Id = typia.random<string & tags.Format<"uuid">>();
  // 4. Create initial product with category1 using update endpoint
  const productId = typia.random<string & tags.Format<"uuid">>();
  const initialProduct =
    await api.functional.ecommerceMall.seller.products.update(
      sellerConnection,
      {
        productId,
        body: {
          name: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          category_id: category1Id,
        } satisfies IEcommerceMallProduct.IUpdate,
      },
    );
  typia.assert(initialProduct);
  // 5. Verify initial product state with category1
  TestValidator.equals(
    "initial product has category1",
    initialProduct.category.id,
    category1Id,
  );
  // 6. Update product to change category to category2 (triggers snapshot)
  const updatedProduct =
    await api.functional.ecommerceMall.seller.products.update(
      sellerConnection,
      {
        productId: initialProduct.id,
        body: {
          category_id: category2Id,
        } satisfies IEcommerceMallProduct.IUpdate,
      },
    );
  typia.assert(updatedProduct);
  // 7. Verify product now has category2
  TestValidator.equals(
    "updated product has category2",
    updatedProduct.category.id,
    category2Id,
  );
  TestValidator.notEquals(
    "category changed from category1 to category2",
    category1Id,
    category2Id,
  );
  // 8. Validate snapshot was created preserving old category1
  TestValidator.equals(
    "snapshot count is 1 after category change",
    updatedProduct.snapshots.length,
    1,
  );
  const snapshot = updatedProduct.snapshots[0];
  typia.assert(snapshot);
  // 9. Validate snapshot contains old category_id (category1)
  TestValidator.equals(
    "snapshot preserves old category_id (category1)",
    snapshot.category?.id ?? "",
    category1Id,
  );
  // 10. Validate snapshot preserves other key fields
  TestValidator.equals(
    "snapshot preserves product name",
    snapshot.name,
    initialProduct.name,
  );
  TestValidator.equals(
    "snapshot preserves description",
    snapshot.description,
    initialProduct.description,
  );
  TestValidator.equals(
    "snapshot preserves base_price",
    snapshot.basePrice,
    initialProduct.base_price,
  );
  TestValidator.equals(
    "snapshot preserves seller",
    snapshot.seller.id,
    initialProduct.seller.id,
  );
  TestValidator.equals(
    "snapshot preserves isActive",
    snapshot.isActive,
    initialProduct.is_active,
  );
  // 11. Validate snapshot immutability - snapshot created before update
  TestValidator.predicate(
    "snapshot created before update timestamp",
    () => new Date(snapshot.createdAt) < new Date(updatedProduct.updated_at),
  );
}
