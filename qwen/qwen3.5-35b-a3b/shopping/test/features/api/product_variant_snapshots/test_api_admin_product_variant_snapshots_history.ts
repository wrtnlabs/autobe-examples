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
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_admin_product_variant_snapshots_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuthorized);
  // Login as admin
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 2. Seller setup
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuthorized);
  // Login as seller
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 3. Seller creates product with variants
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // Extract first variant
  const variant = product.variants[0];
  typia.assert(variant);
  const productId = product.id;
  const variantId = variant.id;
  // 4. First variant update - creates snapshot
  const firstUpdateBody = {
    sku: typia.random<string & tags.MaxLength<255>>(),
    base_price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<100000>
    >(),
    sale_price: null,
    status: "active",
    sort_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<100>
    >(),
    is_default: true,
  } satisfies IEcommerceMallProductVariant.IUpdate;
  const updatedVariant1 =
    await api.functional.ecommerceMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: productId,
        variantId: variantId,
        body: firstUpdateBody,
      },
    );
  typia.assert(updatedVariant1);
  // Wait briefly to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 5. Second variant update - creates another snapshot
  const secondUpdateBody = {
    sku: typia.random<string & tags.MaxLength<255>>(),
    base_price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<100000>
    >(),
    sale_price: updatedVariant1.basePrice + 5000,
    status: "inactive",
    sort_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<100>
    >(),
    is_default: false,
  } satisfies IEcommerceMallProductVariant.IUpdate;
  const updatedVariant2 =
    await api.functional.ecommerceMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: productId,
        variantId: variantId,
        body: secondUpdateBody,
      },
    );
  typia.assert(updatedVariant2);
  // 6. Admin retrieves snapshot history
  const snapshotPage =
    await api.functional.ecommerceMall.admin.products.variants.snapshots.index(
      adminConnection,
      {
        productId: productId,
        variantId: variantId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(snapshotPage);
  // 7. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    snapshotPage.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", snapshotPage.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records > 0",
    snapshotPage.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination pages > 0",
    snapshotPage.pagination.pages > 0,
  );
  // 8. Validate at least 2 snapshots (first create + 2 updates)
  TestValidator.predicate(
    "at least 2 snapshots exist",
    snapshotPage.data.length >= 2,
  );
  // 9. Validate snapshots are ordered by created_at descending (newest first)
  for (let i = 1; i < snapshotPage.data.length; i++) {
    const previous = snapshotPage.data[i - 1];
    const current = snapshotPage.data[i];
    TestValidator.predicate(
      `snapshot ${i} should be older than snapshot ${i - 1}`,
      new Date(previous.created_at).getTime() >
        new Date(current.created_at).getTime(),
    );
  }
  // 10. Validate each snapshot contains complete variant state
  for (const snapshot of snapshotPage.data) {
    typia.assert(snapshot);
    // Validate required fields exist
    TestValidator.predicate("sku_code is defined", snapshot.sku_code !== "");
    TestValidator.predicate("options is defined", snapshot.options !== "");
    TestValidator.predicate("price is defined", snapshot.price >= 0);
    TestValidator.predicate(
      "stock_quantity is defined",
      snapshot.stock_quantity >= 0,
    );
    TestValidator.predicate("status is defined", snapshot.status !== "");
    TestValidator.predicate(
      "created_at is valid date-time",
      snapshot.created_at !== "",
    );
  }
  // 11. Verify at least one snapshot has complete state data
  const hasValidSnapshot = snapshotPage.data.some(
    (snapshot) =>
      snapshot.sku_code !== "" &&
      snapshot.price > 0 &&
      snapshot.stock_quantity >= 0 &&
      snapshot.status !== "" &&
      snapshot.options !== "",
  );
  TestValidator.predicate(
    "at least one snapshot with complete state exists",
    hasValidSnapshot,
  );
}