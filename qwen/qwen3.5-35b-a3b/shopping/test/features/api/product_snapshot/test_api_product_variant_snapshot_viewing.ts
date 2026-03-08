import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
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

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_product_variant_snapshot_viewing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
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
  // 2. Setup: Use placeholder product and variant (scenario says they exist)
  const productId = typia.random<string & tags.Format<"uuid">>();
  const variantId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create snapshot history by editing variant multiple times
  const editCount = 5;
  for (let i = 0; i < editCount; i++) {
    const variantUpdate =
      await api.functional.ecommerceMall.seller.products.variants.update(
        sellerConnection,
        {
          productId: productId,
          variantId: variantId,
          body: {
            sku_code: `SKU-${RandomGenerator.alphaNumeric(6)}`,
            option_values: {
              size: RandomGenerator.alphabets(5),
              color: RandomGenerator.alphabets(5),
            } satisfies {
              [key: string]: string;
            },
            price_override: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<100>
            >(),
            stock_quantity: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<100>
            >(),
            is_active: true,
          } satisfies IEcommerceMallProductVariant.IUpdate,
        },
      );
    typia.assert(variantUpdate);
  }
  // 4. Retrieve snapshot list with pagination
  const snapshotPage =
    await api.functional.ecommerceMall.products.variant_snapshots.index(
      sellerConnection,
      {
        productId: productId,
        body: {
          page: 1,
          limit: 10,
          sortDirection: "desc",
        } satisfies IEcommerceMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(snapshotPage);
  // 5. Validate snapshot data
  TestValidator.equals(
    "snapshot count matches edits",
    snapshotPage.pagination.records,
    editCount,
  );
  TestValidator.equals("total pages correct", snapshotPage.pagination.pages, 1);
  TestValidator.equals(
    "current page correct",
    snapshotPage.pagination.current,
    1,
  );
  TestValidator.equals("limit correct", snapshotPage.pagination.limit, 10);
  // Validate each snapshot has required fields
  for (const snapshot of snapshotPage.data) {
    typia.assert(snapshot);
    // Verify all required fields exist
    TestValidator.equals("snapshot has id", snapshot.id !== undefined, true);
    TestValidator.equals(
      "snapshot has sku_code",
      snapshot.sku_code !== undefined,
      true,
    );
    TestValidator.equals(
      "snapshot has option_values",
      snapshot.option_values !== undefined,
      true,
    );
    TestValidator.equals(
      "snapshot has price_override",
      snapshot.price_override !== undefined,
      true,
    );
    TestValidator.equals(
      "snapshot has stock_quantity",
      snapshot.stock_quantity !== undefined,
      true,
    );
    TestValidator.equals(
      "snapshot has is_active",
      snapshot.is_active !== undefined,
      true,
    );
    TestValidator.equals(
      "snapshot has created_at",
      snapshot.created_at !== undefined,
      true,
    );
    TestValidator.equals(
      "snapshot has product_variant",
      snapshot.product_variant !== undefined,
      true,
    );
    // Validate product_variant reference
    typia.assert(snapshot.product_variant);
    TestValidator.equals(
      "variant has product",
      snapshot.product_variant.product.id !== undefined,
      true,
    );
  }
  // 6. Test cursor-based pagination
  if (snapshotPage.data.length > 0) {
    const lastSnapshot = snapshotPage.data[snapshotPage.data.length - 1];
    const cursorPage =
      await api.functional.ecommerceMall.products.variant_snapshots.index(
        sellerConnection,
        {
          productId: productId,
          body: {
            page: 2,
            limit: 10,
            sortDirection: "desc",
            created_atGt: lastSnapshot.created_at,
          } satisfies IEcommerceMallProductVariantSnapshot.IRequest,
        },
      );
    typia.assert(cursorPage);
    TestValidator.equals(
      "page 2 has no more records",
      cursorPage.pagination.records,
      editCount,
    );
    TestValidator.equals("page 2 has no data", cursorPage.data.length, 0);
  }
  // 7. Test filtering by active status
  const activeSnapshots =
    await api.functional.ecommerceMall.products.variant_snapshots.index(
      sellerConnection,
      {
        productId: productId,
        body: {
          page: 1,
          limit: 10,
          is_active: true,
        } satisfies IEcommerceMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(activeSnapshots);
  TestValidator.equals(
    "all snapshots are active",
    activeSnapshots.data.every((s) => s.is_active === true),
    true,
  );
}
