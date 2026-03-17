import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariantSnapshot";
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
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_admin_variant_snapshots_by_change_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - join and login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin);
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 2. Seller setup - join and login
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(seller);
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 3. Seller creates product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<number & tags.Minimum<100>>(),
      },
    },
  );
  typia.assert(product);
  // 4. Seller creates first variant (creates "created" snapshot)
  const variant1 =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku: typia.random<string & tags.MaxLength<50>>(),
          options: { size: "Large", color: "Blue" },
          base_price: typia.random<number & tags.Minimum<1000>>(),
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          status: "active",
        },
      },
    );
  typia.assert(variant1);
  // 5. Seller creates second variant (creates another "created" snapshot)
  const variant2 =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku: typia.random<string & tags.MaxLength<50>>(),
          options: { size: "Medium", color: "Red" },
          base_price: typia.random<number & tags.Minimum<1000>>(),
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          status: "active",
        },
      },
    );
  typia.assert(variant2);
  // 6. Admin queries snapshots filtered by changeType=created for variant1
  const createdSnapshotsResponse =
    await api.functional.ecommerceMall.admin.products.variants.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        variantId: variant1.id,
        body: {
          changeType: "created",
          limit: 100,
        },
      },
    );
  typia.assert(createdSnapshotsResponse);
  // 7. Validate only "created" snapshots are returned (should be at least 1)
  TestValidator.equals(
    "created snapshots exist",
    createdSnapshotsResponse.data.length > 0,
    true,
  );
  // 8. Admin queries snapshots filtered by changeType=updated for variant1 (may have none if never updated)
  const updatedSnapshotsResponse =
    await api.functional.ecommerceMall.admin.products.variants.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        variantId: variant1.id,
        body: {
          changeType: "updated",
          limit: 100,
        },
      },
    );
  typia.assert(updatedSnapshotsResponse);
  // 9. Verify created and updated responses are different (one has data, other may not)
  TestValidator.notEquals(
    "snapshot counts differ",
    createdSnapshotsResponse.data.length,
    updatedSnapshotsResponse.data.length,
  );
  // 10. Validate created snapshots have valid structure
  for (const snapshot of createdSnapshotsResponse.data) {
    typia.assert(snapshot);
    TestValidator.equals("sku_code exists", snapshot.sku_code.length > 0, true);
    TestValidator.predicate("price is positive", snapshot.price > 0);
    TestValidator.predicate(
      "stock_quantity is non-negative",
      snapshot.stock_quantity >= 0,
    );
    TestValidator.equals("status exists", snapshot.status.length > 0, true);
  }
  // 11. Admin queries snapshots without filter (should return both created and updated)
  const allSnapshotsResponse =
    await api.functional.ecommerceMall.admin.products.variants.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        variantId: variant1.id,
        body: {},
      },
    );
  typia.assert(allSnapshotsResponse);
  // 12. Validate pagination info
  TestValidator.predicate(
    "pagination has limit",
    allSnapshotsResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records",
    allSnapshotsResponse.pagination.records >= 0,
  );
}