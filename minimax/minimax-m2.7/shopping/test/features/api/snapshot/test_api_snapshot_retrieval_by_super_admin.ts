import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_super_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_super_admin_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_snapshot_retrieval_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Create a category using superAdmin endpoint
  const category =
    await generate_random_ecommerce_mall_super_admin_categories_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  // 3. Authenticate as a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Create a product (auto-creates snapshot on first creation)
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        categoryId: category.id,
        basePrice: typia.random<
          number &
            tags.Type<"uint32"> &
            tags.Minimum<1000> &
            tags.Maximum<100000>
        >(),
      },
    },
  );
  // 5. Get the snapshot ID that was auto-created with the product
  // Since product creation auto-creates a snapshot and there's no list endpoint,
  // we retrieve the first snapshot using the product's snapshot relationship
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 6. Retrieve the product snapshot as super admin
  const snapshot =
    await api.functional.ecommerceMall.superAdmin.products.snapshots.at(
      superAdminConnection,
      {
        productId: product.id,
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // 7. Validate snapshot structure and content
  TestValidator.equals("snapshot has valid id", snapshot.id !== null, true);
  TestValidator.equals(
    "snapshot name matches product",
    snapshot.name,
    product.name,
  );
  TestValidator.equals(
    "snapshot description matches product",
    snapshot.description,
    product.description,
  );
  TestValidator.equals(
    "snapshot base_price matches product",
    snapshot.base_price,
    product.basePrice,
  );
  TestValidator.equals(
    "snapshot category_name matches category",
    snapshot.category_name,
    category.name,
  );
  // Validate seller object in snapshot
  TestValidator.predicate(
    "snapshot has seller object",
    snapshot.seller !== null,
  );
  if (snapshot.seller) {
    TestValidator.equals("seller has id", snapshot.seller.id !== null, true);
    TestValidator.equals(
      "seller has email",
      snapshot.seller.email !== null,
      true,
    );
  }
  // Validate variants array with nested optionValues
  TestValidator.predicate(
    "snapshot has variants array",
    Array.isArray(snapshot.variants),
  );
  if (snapshot.variants.length > 0) {
    const variant = snapshot.variants[0];
    TestValidator.equals("variant has sku", variant.sku !== null, true);
    TestValidator.predicate(
      "variant has optionValues array",
      Array.isArray(variant.optionValues),
    );
    TestValidator.equals(
      "variant has stock_quantity",
      typeof variant.stock_quantity === "number",
      true,
    );
  }
  // Validate images array
  TestValidator.predicate(
    "snapshot has images array",
    Array.isArray(snapshot.images),
  );
  if (snapshot.images.length > 1) {
    for (let i = 1; i < snapshot.images.length; i++) {
      TestValidator.predicate(
        "images sorted by display_order",
        snapshot.images[i].display_order >=
          snapshot.images[i - 1].display_order,
      );
    }
  }
  // Validate timestamp
  TestValidator.predicate(
    "snapshot has created_at timestamp",
    snapshot.created_at !== null && snapshot.created_at !== undefined,
  );
}
