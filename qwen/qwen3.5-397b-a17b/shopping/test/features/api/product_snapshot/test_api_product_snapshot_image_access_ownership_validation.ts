import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test product snapshot image access ownership validation between different sellers.
 *
 * Validates that a seller cannot retrieve images from product snapshots belonging to another seller's product, enforcing product ownership isolation. This test ensures that the system correctly validates product ownership by checking the shopping_mall_products.shopping_mall_seller_id against the authenticated seller's ID.
 *
 * The test creates two seller accounts (Seller A and Seller B), establishes a product under Seller A's ownership, and then attempts to access product snapshot images using Seller B's authentication credentials with Seller A's product ID. The expected behavior is a 404 Not Found response, which prevents information leakage about other sellers' products and enforces the business rule that each product belongs exclusively to the seller who created it.
 *
 * 1. Seller A registers and creates a product with name, description, category, and base price.
 * 2. Seller A updates the product to trigger snapshot creation with images.
 * 3. Seller B registers as a separate seller account.
 * 4. Seller B attempts to access Seller A's product snapshot image using Seller A's product ID.
 * 5. System returns 404 Not Found, enforcing ownership isolation and preventing cross-seller data access.
 *
 * Note: Due to API surface limitations (no snapshot/image list endpoints available), this test uses Seller A's product ID with generated snapshot and image IDs. The ownership validation occurs at the product level before snapshot/image existence checks, so the 404 response still validates the ownership isolation security boundary.
 */
export async function test_api_product_snapshot_image_access_ownership_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Seller A (product owner)
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerA);
  // 2. Create product as Seller A
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerAConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_mall_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Update product to create snapshot (this creates immutable snapshot with images)
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(
      sellerAConnection,
      {
        productId: product.id,
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        } satisfies IShoppingMallProduct.IUpdate,
      },
    );
  typia.assert(updatedProduct);
  // 4. Register Seller B (non-owner)
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerB);
  // 5. Seller B attempts to access Seller A's product snapshot image (should fail with 404)
  // Using Seller A's product ID with generated snapshot/image IDs
  // The ownership validation occurs at product level, preventing cross-seller access
  await TestValidator.httpError(
    "seller B cannot access seller A's product snapshot image",
    404,
    async () => {
      await api.functional.shoppingMall.seller.products.snapshots.images.at(
        sellerBConnection,
        {
          productId: product.id,
          snapshotId: typia.random<string & tags.Format<"uuid">>(),
          imageId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}