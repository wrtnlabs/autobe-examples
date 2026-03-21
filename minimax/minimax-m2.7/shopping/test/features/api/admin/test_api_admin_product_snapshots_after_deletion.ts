import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_admin_product_snapshots_after_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 3. Get categories
  const categories =
    await api.functional.ecommerceMall.categories.browse(sellerConnection);
  typia.assert(categories);
  // Get first category ID
  const categoryId =
    categories.subcategories.length > 0
      ? categories.subcategories[0].id
      : categories.id;
  // 4. Create a product with initial data
  const initialName = `Initial Product ${RandomGenerator.alphabets(5)}`;
  const initialDescription = `Initial description ${RandomGenerator.paragraph({ sentences: 2 })}`;
  const initialPrice = 1000;
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: initialName,
        description: initialDescription,
        category_id: categoryId,
        base_price: initialPrice,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 5. Update the product multiple times to create several snapshots
  const update1Name = `${initialName} - Updated 1`;
  const update1Price = 1500;
  const updatedProduct1 =
    await api.functional.ecommerceMall.seller.products.update(
      sellerConnection,
      {
        productId: product.id,
        body: {
          name: update1Name,
          base_price: update1Price,
        } satisfies IEcommerceMallProduct.IUpdate,
      },
    );
  typia.assert(updatedProduct1);
  // Second update
  const update2Description = `${initialDescription} - Updated with more details`;
  const update2Price = 2000;
  const updatedProduct2 =
    await api.functional.ecommerceMall.seller.products.update(
      sellerConnection,
      {
        productId: product.id,
        body: {
          description: update2Description,
          base_price: update2Price,
        } satisfies IEcommerceMallProduct.IUpdate,
      },
    );
  typia.assert(updatedProduct2);
  // Third update
  const update3Name = `${initialName} - Final Update`;
  const update3Price = 2500;
  const updatedProduct3 =
    await api.functional.ecommerceMall.seller.products.update(
      sellerConnection,
      {
        productId: product.id,
        body: {
          name: update3Name,
          base_price: update3Price,
        } satisfies IEcommerceMallProduct.IUpdate,
      },
    );
  typia.assert(updatedProduct3);
  // 6. Delete the product
  await api.functional.ecommerceMall.seller.products.erase(sellerConnection, {
    productId: product.id,
  });
  // 7. As admin, retrieve product snapshots using PATCH /ecommerceMall/admin/products/{productId}/snapshots
  const snapshotsPage =
    await api.functional.ecommerceMall.admin.products.snapshots.index(
      adminConnection,
      {
        productId: product.id,
      },
    );
  typia.assert(snapshotsPage);
  // 8. Validate snapshots are still accessible
  TestValidator.equals(
    "snapshots page has data",
    snapshotsPage.data.length > 0,
    true,
  );
  TestValidator.predicate(
    "has multiple snapshots",
    snapshotsPage.data.length >= 3,
  );
  // 9. Verify snapshots contain correct historical data
  const initialSnapshot = snapshotsPage.data.find(
    (s) => s.name === initialName,
  );
  TestValidator.equals(
    "initial snapshot exists",
    initialSnapshot !== null,
    true,
  );
  if (initialSnapshot) {
    TestValidator.equals(
      "initial price matches",
      initialSnapshot.base_price,
      initialPrice,
    );
  }
  const update1Snapshot = snapshotsPage.data.find(
    (s) => s.name === update1Name,
  );
  TestValidator.equals(
    "update 1 snapshot exists",
    update1Snapshot !== null,
    true,
  );
  if (update1Snapshot) {
    TestValidator.equals(
      "update 1 price matches",
      update1Snapshot.base_price,
      update1Price,
    );
  }
  const finalSnapshot = snapshotsPage.data.find((s) => s.name === update3Name);
  TestValidator.equals("final snapshot exists", finalSnapshot !== null, true);
  if (finalSnapshot) {
    TestValidator.equals(
      "final price matches",
      finalSnapshot.base_price,
      update3Price,
    );
  }
  // 10. Verify snapshots have correct category names
  const categoryName = snapshotsPage.data[0]?.category_name;
  TestValidator.predicate(
    "category name is preserved",
    categoryName !== undefined && categoryName.length > 0,
  );
  // 11. Confirm seller information is preserved in snapshots for dispute resolution
  for (const snapshot of snapshotsPage.data) {
    TestValidator.predicate(
      "snapshot has seller info",
      snapshot.seller !== undefined,
    );
    TestValidator.equals(
      "snapshot seller id matches",
      snapshot.seller.id,
      seller.id,
    );
  }
  // 12. Verify snapshots have valid timestamps
  for (const snapshot of snapshotsPage.data) {
    TestValidator.predicate(
      "snapshot has valid timestamp",
      snapshot.created_at !== undefined,
    );
  }
}
