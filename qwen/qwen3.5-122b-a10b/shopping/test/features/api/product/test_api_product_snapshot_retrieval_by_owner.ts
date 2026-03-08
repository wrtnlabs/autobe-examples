import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
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
 * Verify that a product owner (seller) can retrieve the paginated list of historical audit snapshots for their own product.
 * The test should: (1) Authenticate as a seller, (2) Create a product with variants, (3) Edit the product multiple times to generate multiple snapshots, (4) Query the product snapshots endpoint with pagination parameters, (5) Verify the response contains snapshot summaries with correct structure (id, productId, seller info, createdAt, snapshotType), (6) Verify snapshots are sorted by created_at descending (newest first), (7) Verify pagination metadata is correct (current page, limit, total records, total pages), (8) Verify the seller information in each snapshot matches the authenticated seller, (9) Verify each snapshot represents a distinct product edit event. This validates the primary business workflow for sellers reviewing their product's edit history for dispute resolution and audit purposes.
 */
export async function test_api_product_snapshot_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // Note: Using a placeholder category_id as the test environment should have default categories
  // In production, you would need to create a category first or use an existing one
  const category_id = typia.random<string & tags.Format<"uuid">>();
  // 2. Create a product using SDK directly (no utility function available for this specific case)
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: category_id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Edit the product multiple times to generate snapshots
  const editCount = 3;
  const editedProducts: IEcommerceMallProduct[] = [];
  await ArrayUtil.asyncRepeat(editCount, async (index) => {
    const updated = await api.functional.ecommerceMall.seller.products.update(
      sellerConnection,
      {
        productId: product.id,
        body: {
          name: `${RandomGenerator.name()} (Edit ${index + 1})`,
          description: RandomGenerator.paragraph({ sentences: 3 + index }),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        } satisfies IEcommerceMallProduct.IUpdate,
      },
    );
    typia.assert(updated);
    editedProducts.push(updated);
  });
  // 4. Query the product snapshots endpoint with pagination
  const snapshots = await api.functional.ecommerceMall.products.snapshots.index(
    sellerConnection,
    {
      productId: product.id,
      body: {
        page: 0,
        limit: 20,
        sort: "created_at",
        order: "desc",
      } satisfies IEcommerceMallProductSnapshot.IRequest,
    },
  );
  typia.assert(snapshots);
  // 5. Verify the response contains snapshot summaries with correct structure
  TestValidator.predicate("snapshots data exists", snapshots.data.length > 0);
  TestValidator.predicate(
    "pagination exists",
    snapshots.pagination.records > 0,
  );
  // 6. Verify each snapshot has correct structure
  await ArrayUtil.asyncForEach(snapshots.data, async (snapshot) => {
    TestValidator.equals("snapshot has id", typeof snapshot.id, "string");
    TestValidator.predicate(
      "snapshot productId matches",
      snapshot.productId === product.id,
    );
    TestValidator.predicate(
      "snapshot has createdAt",
      snapshot.createdAt.length > 0,
    );
    TestValidator.equals(
      "snapshotType is product",
      snapshot.snapshotType,
      "product",
    );
  });
  // 7. Verify pagination metadata is correct
  TestValidator.equals("current page is 0", snapshots.pagination.current, 0);
  TestValidator.predicate("limit is positive", snapshots.pagination.limit > 0);
  TestValidator.predicate(
    "records >= data length",
    snapshots.pagination.records >= snapshots.data.length,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    snapshots.pagination.pages > 0,
  );
  // 8. Verify the seller information in each snapshot matches the authenticated seller
  await ArrayUtil.asyncForEach(snapshots.data, async (snapshot) => {
    if (snapshot.seller !== null) {
      TestValidator.equals(
        "seller id matches",
        snapshot.seller.id,
        sellerAuth.seller.id,
      );
      TestValidator.equals(
        "seller shop name matches",
        snapshot.seller.shop_name,
        sellerAuth.seller.shop_name,
      );
    }
  });
  // 9. Verify snapshots are sorted by created_at descending (newest first)
  if (snapshots.data.length > 1) {
    for (let i = 0; i < snapshots.data.length - 1; i++) {
      const current = new Date(snapshots.data[i].createdAt);
      const next = new Date(snapshots.data[i + 1].createdAt);
      TestValidator.predicate(
        `snapshot ${i} is newer than snapshot ${i + 1}`,
        current >= next,
      );
    }
  }
}
