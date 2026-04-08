import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductSnapshot";
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

/**
 * Test seller view of product snapshots for their own product.
 *
 * Validates the snapshot retrieval workflow where an approved seller can view
 * historical modification records for products they own. Tests snapshot
 * creation through product creation and paginated retrieval.
 *
 * Special attention is given to verifying that snapshots capture the
 * product state at creation time and that pagination metadata is accurate.
 *
 * 1. Seller joins platform and obtains approval status 'approved'.
 * 2. Seller creates product with name, description, and pricing.
 * 3. Seller retrieves paginated snapshots for their product.
 * 4. Validates pagination metadata (current, limit, records, pages).
 * 5. Validates each snapshot contains required fields (id, name, base_price,
 *    created_at, entity_status, action, category).
 * 6. Validates snapshots are ordered by created_at DESC (newest first).
 */
export async function test_api_product_snapshots_view_ownership(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - join and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IEcommerceMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(2),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(seller);
  // 2. Generate random category and product data
  // Note: Using typia.random for category_id assumes pre-existing categories in test DB
  const category: IEcommerceMallCategory.ISummary =
    typia.random<IEcommerceMallCategory.ISummary>();
  typia.assert(category);
  const initialName = RandomGenerator.name(4);
  const initialPrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000>
  >();
  // 3. Seller creates product (creation snapshot will be created)
  const product: IEcommerceMallProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          name: initialName,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          category_id: category.id,
          base_price: initialPrice,
        },
      },
    );
  typia.assert(product);
  // 4. Retrieve snapshots for own product
  const snapshotsResponse: IPageIEcommerceMallProductSnapshot.ISummary =
    await api.functional.ecommerceMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<200>
          >(),
          page: 1,
        },
      },
    );
  typia.assert(snapshotsResponse);
  // 5. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    snapshotsResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    snapshotsResponse.pagination.limit >= 1 &&
      snapshotsResponse.pagination.limit <= 200,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    snapshotsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    snapshotsResponse.pagination.pages >= 0,
  );
  // 6. Validate snapshots exist
  TestValidator.predicate(
    "at least 1 snapshot created (creation snapshot)",
    snapshotsResponse.data.length >= 1,
  );
  // 7. Validate snapshot content
  snapshotsResponse.data.forEach((snapshot, index) => {
    typia.assert(snapshot);
    TestValidator.predicate(
      `snapshot ${index} has valid id`,
      snapshot.id !== undefined && snapshot.id.length > 0,
    );
    TestValidator.predicate(
      `snapshot ${index} name is non-empty`,
      snapshot.name.length > 0,
    );
    TestValidator.predicate(
      `snapshot ${index} base_price is positive`,
      snapshot.base_price > 0,
    );
    TestValidator.predicate(
      `snapshot ${index} created_at is valid date-time`,
      snapshot.created_at !== undefined && snapshot.created_at.length > 0,
    );
    TestValidator.predicate(
      `snapshot ${index} entity_status is non-empty`,
      snapshot.entity_status.length > 0,
    );
    TestValidator.predicate(
      `snapshot ${index} action is non-empty`,
      snapshot.action.length > 0,
    );
    TestValidator.predicate(
      `snapshot ${index} category is present`,
      snapshot.category !== undefined,
    );
    TestValidator.equals(
      `snapshot ${index} category has valid id`,
      snapshot.category.id !== undefined,
      true,
    );
    TestValidator.predicate(
      `snapshot ${index} category name is non-empty`,
      snapshot.category.name.length > 0,
    );
  });
  // 8. Verify oldest snapshot has initial product values
  if (snapshotsResponse.data.length > 0) {
    const oldestSnapshot =
      snapshotsResponse.data[snapshotsResponse.data.length - 1];
    TestValidator.equals(
      "oldest snapshot has initial name",
      oldestSnapshot.name,
      initialName,
    );
    TestValidator.equals(
      "oldest snapshot has initial price",
      oldestSnapshot.base_price,
      initialPrice,
    );
  }
  // 9. Verify snapshots are ordered by created_at DESC (newest first)
  if (snapshotsResponse.data.length >= 2) {
    for (let i = 0; i < snapshotsResponse.data.length - 1; i++) {
      const current = snapshotsResponse.data[i];
      const next = snapshotsResponse.data[i + 1];
      TestValidator.predicate(
        `snapshots ordered DESC at index ${i}`,
        new Date(current.created_at).getTime() >=
          new Date(next.created_at).getTime(),
      );
    }
  }
}
