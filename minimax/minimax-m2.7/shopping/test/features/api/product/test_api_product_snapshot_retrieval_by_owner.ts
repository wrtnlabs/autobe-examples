import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductSnapshotVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariantOptionValue";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
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

export async function test_api_product_snapshot_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register and join as a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // Step 2: Create a new product with required fields
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // Step 3: Update the product to trigger additional snapshot creation
  const updatedProduct =
    await api.functional.ecommerceMall.seller.products.update(
      sellerConnection,
      {
        productId: product.id,
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies IEcommerceMallProduct.IUpdate,
      },
    );
  typia.assert(updatedProduct);
  // Step 4: List product snapshots to get snapshot IDs
  const snapshotsPage =
    await api.functional.ecommerceMall.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        body: {} satisfies IEcommerceMallProductSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsPage);
  // Validate at least one snapshot exists
  TestValidator.predicate("snapshots exist", snapshotsPage.data.length > 0);
  // Get the latest snapshot ID (newest first)
  const latestSnapshot = snapshotsPage.data[0];
  // Step 5: Retrieve a specific snapshot using the snapshotId
  const snapshot =
    await api.functional.ecommerceMall.seller.products.snapshots.at(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: latestSnapshot.id,
      },
    );
  typia.assert(snapshot);
  // Validation: Snapshot contains required fields
  TestValidator.equals("snapshot id matches", snapshot.id, latestSnapshot.id);
  TestValidator.equals(
    "snapshot name is string",
    typeof snapshot.name,
    "string",
  );
  TestValidator.equals(
    "snapshot description is string",
    typeof snapshot.description,
    "string",
  );
  TestValidator.equals(
    "snapshot base_price is number",
    typeof snapshot.base_price,
    "number",
  );
  TestValidator.equals(
    "snapshot category_name is string",
    typeof snapshot.category_name,
    "string",
  );
  TestValidator.equals(
    "snapshot created_at is string",
    typeof snapshot.created_at,
    "string",
  );
  // Validation: Snapshot created_at timestamp is in the past (after product creation)
  const snapshotTime = new Date(snapshot.created_at).getTime();
  const productCreationTime = new Date(product.createdAt).getTime();
  TestValidator.predicate(
    "snapshot created_at is after product creation",
    snapshotTime >= productCreationTime,
  );
  // Validation: Seller info matches authenticated seller
  TestValidator.equals(
    "snapshot seller id matches",
    snapshot.seller.id,
    seller.id,
  );
  TestValidator.equals(
    "snapshot seller email matches",
    snapshot.seller.email,
    seller.email,
  );
  TestValidator.equals(
    "snapshot seller approvalStatus matches",
    snapshot.seller.approvalStatus,
    seller.approvalStatus,
  );
  // Validation: Snapshot contains variants array
  TestValidator.equals(
    "snapshot variants is array",
    Array.isArray(snapshot.variants),
    true,
  );
  // Validation: Snapshot contains images array
  TestValidator.equals(
    "snapshot images is array",
    Array.isArray(snapshot.images),
    true,
  );
}
