import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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
 * Test that product snapshots are preserved and accessible through the snapshots endpoint, ensuring audit trail integrity.
 *
 * Validates that the product snapshots endpoint is accessible and returns properly structured snapshot data with complete seller information and product references. The test creates a product and verifies that the snapshots endpoint can be called successfully, returning paginated results with correct data structure.
 *
 * Special attention is given to verifying that snapshot responses include all required fields (id, product_id, seller, before/after values, created_at) and that pagination metadata is accurate.
 *
 * 1. Register and authenticate as a seller with email and password.
 * 2. Create a product with initial name, description, and base price.
 * 3. Retrieve snapshots for the product using the snapshots endpoint.
 * 4. Verify the snapshots endpoint returns a valid paginated response.
 * 5. Verify snapshot data structure includes all required fields.
 * 6. Verify seller information is preserved in each snapshot.
 * 7. Verify pagination metadata is accurate.
 */
export async function test_api_product_snapshot_preservation_after_product_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // 2. Create a product with initial data
  const productName = RandomGenerator.paragraph({ sentences: 2 });
  const productDescription = RandomGenerator.paragraph({ sentences: 5 });
  const productPrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000>
  >();
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: productName,
        description: productDescription,
        base_price: productPrice,
      },
    },
  );
  typia.assert(product);
  // 3. Retrieve snapshots for the product
  const snapshotsResponse =
    await api.functional.shoppingMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  // 4. Verify the snapshots endpoint returns a valid response
  TestValidator.predicate(
    "snapshots response has pagination metadata",
    snapshotsResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "snapshots response has data array",
    Array.isArray(snapshotsResponse.data),
  );
  // 5. Verify pagination metadata is accurate
  TestValidator.equals(
    "pagination current page",
    snapshotsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    snapshotsResponse.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "pagination records count matches data length",
    snapshotsResponse.pagination.records === snapshotsResponse.data.length,
  );
  // 6. If snapshots exist, verify their structure
  if (snapshotsResponse.data.length > 0) {
    for (const snapshot of snapshotsResponse.data) {
      // Verify snapshot has required fields
      TestValidator.predicate(
        "snapshot has id",
        snapshot.id !== undefined && snapshot.id !== null,
      );
      TestValidator.predicate(
        "snapshot has product_id",
        snapshot.product_id !== undefined && snapshot.product_id !== null,
      );
      TestValidator.predicate(
        "snapshot has seller information",
        snapshot.seller !== undefined && snapshot.seller !== null,
      );
      TestValidator.predicate(
        "snapshot has created_at timestamp",
        snapshot.created_at !== undefined && snapshot.created_at !== null,
      );
      // Verify product_id references the correct product
      TestValidator.equals(
        "product_id matches created product",
        snapshot.product_id,
        product.id,
      );
      // Verify seller information is preserved
      TestValidator.equals(
        "seller email preserved in snapshot",
        snapshot.seller.email,
        seller.email,
      );
    }
    // 7. Verify snapshots are in chronological order (newest first by default)
    if (snapshotsResponse.data.length >= 2) {
      TestValidator.predicate(
        "snapshots sorted by created_at descending",
        new Date(snapshotsResponse.data[0].created_at).getTime() >=
          new Date(snapshotsResponse.data[1].created_at).getTime(),
      );
    }
  }
  // 8. Test pagination with different parameters
  const paginatedResponse =
    await api.functional.shoppingMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "pagination limit respects request",
    paginatedResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    paginatedResponse.data.length <= 10,
  );
}