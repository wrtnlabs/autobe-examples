import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductImage";
import type { IECommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductSnapshot";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariantOption";
import type { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallProductSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_e_commerce_mall_seller_products_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

/**
 * Test product snapshot filtering by date range and pagination.
 *
 * Validates that the server correctly filters product snapshots using optional
 * date-range query parameters (created_at_from, created_at_to) and pagination
 * controls. Snapshot records are immutable historical copies automatically
 * created whenever a seller edits a product.
 *
 * The test creates a product, performs three separate edits (name, description,
 * base price) to generate three snapshots, then filters by the middle snapshot's
 * timestamp to confirm precise date-range matching. It also verifies pagination
 * with limit=1 returns the correct subset and correct pagination metadata.
 *
 * 1. Register a seller account via authorize_seller_join.
 * 2. Create a product via generate_random_e_commerce_mall_seller_products_create.
 * 3. Perform three edits (name, description, base_price) to generate three snapshots.
 * 4. Retrieve all snapshots (no filter) — expect 3 records.
 * 5. Filter by the middle snapshot's created_at (inclusive range) — expect 1 record matching that snapshot.
 * 6. Paginate with limit=1, page=1 — expect 1 record with correct pagination metadata.
 */
export async function test_api_product_snapshot_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // Step 2: Create a product
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // Step 3: Edit the product three times to generate three snapshots
  // Edit 1: change name → creates snapshot #1 (earliest)
  const edit1 = await api.functional.eCommerceMall.seller.products.update(
    sellerConnection,
    {
      productId: product.id,
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IECommerceMallProduct.IUpdate,
    },
  );
  typia.assert(edit1);
  // Edit 2: change description → creates snapshot #2 (middle)
  const edit2 = await api.functional.eCommerceMall.seller.products.update(
    sellerConnection,
    {
      productId: product.id,
      body: {
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IECommerceMallProduct.IUpdate,
    },
  );
  typia.assert(edit2);
  // Edit 3: change base_price → creates snapshot #3 (newest)
  const edit3 = await api.functional.eCommerceMall.seller.products.update(
    sellerConnection,
    {
      productId: product.id,
      body: {
        base_price: typia.random<number & tags.Minimum<1000>>(),
      } satisfies IECommerceMallProduct.IUpdate,
    },
  );
  typia.assert(edit3);
  // Step 4: Retrieve all snapshots (no filter) — expect 3
  const allSnapshots: IPageIECommerceMallProductSnapshot.ISummary =
    await api.functional.eCommerceMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {},
      },
    );
  typia.assert(allSnapshots);
  TestValidator.equals(
    "snapshot count before filter",
    allSnapshots.data.length,
    3,
  );
  // Snapshots are sorted newest-first: [snapshot#3, snapshot#2, snapshot#1]
  // The "middle" snapshot is at index 1
  const middleSnapshot = allSnapshots.data[1];
  // Step 5: Filter by the middle snapshot's created_at (inclusive range)
  const filtered: IPageIECommerceMallProductSnapshot.ISummary =
    await api.functional.eCommerceMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          created_at_from: middleSnapshot.created_at,
          created_at_to: middleSnapshot.created_at,
        } satisfies IECommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(filtered);
  TestValidator.equals("filtered snapshot count", filtered.data.length, 1);
  TestValidator.equals(
    "filtered snapshot id matches middle",
    filtered.data[0].id,
    middleSnapshot.id,
  );
  // Step 6: Pagination with limit=1, page=1
  const paginated: IPageIECommerceMallProductSnapshot.ISummary =
    await api.functional.eCommerceMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 1,
        } satisfies IECommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(paginated);
  TestValidator.equals("paginated data count", paginated.data.length, 1);
  TestValidator.equals("pagination current", paginated.pagination.current, 1);
  TestValidator.equals("pagination limit", paginated.pagination.limit, 1);
  TestValidator.equals("pagination records", paginated.pagination.records, 3);
  TestValidator.equals("pagination pages", paginated.pagination.pages, 3);
}
