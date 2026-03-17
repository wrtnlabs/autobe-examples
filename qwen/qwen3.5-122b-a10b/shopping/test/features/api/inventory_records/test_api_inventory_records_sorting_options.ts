import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallInventoryRecord";
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
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

/**
 * Test inventory records sorting options.
 * 1. Create admin account and login
 * 2. Create seller account and login
 * 3. Create category
 * 4. Create product
 * 5. Create multiple variants (each creates initial inventory record with different stock quantities)
 * 6. Test sorting by recorded_at (default, desc)
 * 7. Test sorting by recorded_at (asc)
 * 8. Test sorting by quantity_change (desc)
 * 9. Test sorting by quantity_change (asc)
 * 10. Test sorting by reason (desc)
 * 11. Test sorting by reason (asc)
 */
export async function test_api_inventory_records_sorting_options(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<
        string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>
      >(),
      password: adminPassword,
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminAuth.email,
      password: adminPassword,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 2. Create seller account and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<
        string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>
      >(),
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerAuth.seller.email,
      password: sellerPassword,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 3. Create category
  const category = await api.functional.ecommerceMall.admin.categories.create(
    adminLoginConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // 4. Create product
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerLoginConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: category.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 5. Create multiple variants (each creates initial inventory record)
  const variants = await ArrayUtil.asyncRepeat(5, async (index) => {
    const variant =
      await api.functional.ecommerceMall.seller.products.variants.create(
        sellerLoginConnection,
        {
          productId: product.id,
          body: {
            skuCode: RandomGenerator.alphaNumeric(10),
            optionValues: [
              { key: "color", value: RandomGenerator.alphabets(5) },
            ] satisfies IEcommerceMallProductVariantOption[],
            stockQuantity: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<100>
            >(),
          } satisfies IEcommerceMallProductVariant.ICreate,
        },
      );
    typia.assert(variant);
    return variant;
  });
  // 6. Test sorting by recorded_at (default, desc)
  const recordedAtDesc =
    await api.functional.ecommerceMall.admin.variants.inventory_records.index(
      adminLoginConnection,
      {
        variantId: variants[0].id,
        body: {
          sort_by: "recorded_at",
          sort_order: "desc",
          limit: 100,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(recordedAtDesc);
  // Verify records are sorted by recorded_at descending
  for (let i = 1; i < recordedAtDesc.data.length; i++) {
    TestValidator.predicate(
      `recorded_at descending: record ${i} >= record ${i - 1}`,
      recordedAtDesc.data[i].recorded_at >=
        recordedAtDesc.data[i - 1].recorded_at,
    );
  }
  // 7. Test sorting by recorded_at (asc)
  const recordedAtAsc =
    await api.functional.ecommerceMall.admin.variants.inventory_records.index(
      adminLoginConnection,
      {
        variantId: variants[0].id,
        body: {
          sort_by: "recorded_at",
          sort_order: "asc",
          limit: 100,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(recordedAtAsc);
  // Verify records are sorted by recorded_at ascending
  for (let i = 1; i < recordedAtAsc.data.length; i++) {
    TestValidator.predicate(
      `recorded_at ascending: record ${i} >= record ${i - 1}`,
      recordedAtAsc.data[i].recorded_at >=
        recordedAtAsc.data[i - 1].recorded_at,
    );
  }
  // 8. Test sorting by quantity_change (desc)
  const quantityChangeDesc =
    await api.functional.ecommerceMall.admin.variants.inventory_records.index(
      adminLoginConnection,
      {
        variantId: variants[0].id,
        body: {
          sort_by: "quantity_change",
          sort_order: "desc",
          limit: 100,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(quantityChangeDesc);
  // Verify records are sorted by quantity_change descending
  for (let i = 1; i < quantityChangeDesc.data.length; i++) {
    TestValidator.predicate(
      `quantity_change descending: record ${i} <= record ${i - 1}`,
      quantityChangeDesc.data[i].quantity_change <=
        quantityChangeDesc.data[i - 1].quantity_change,
    );
  }
  // 9. Test sorting by quantity_change (asc)
  const quantityChangeAsc =
    await api.functional.ecommerceMall.admin.variants.inventory_records.index(
      adminLoginConnection,
      {
        variantId: variants[0].id,
        body: {
          sort_by: "quantity_change",
          sort_order: "asc",
          limit: 100,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(quantityChangeAsc);
  // Verify records are sorted by quantity_change ascending
  for (let i = 1; i < quantityChangeAsc.data.length; i++) {
    TestValidator.predicate(
      `quantity_change ascending: record ${i} >= record ${i - 1}`,
      quantityChangeAsc.data[i].quantity_change >=
        quantityChangeAsc.data[i - 1].quantity_change,
    );
  }
  // 10. Test sorting by reason (desc)
  const reasonDesc =
    await api.functional.ecommerceMall.admin.variants.inventory_records.index(
      adminLoginConnection,
      {
        variantId: variants[0].id,
        body: {
          sort_by: "reason",
          sort_order: "desc",
          limit: 100,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(reasonDesc);
  // Verify records are sorted by reason descending
  for (let i = 1; i < reasonDesc.data.length; i++) {
    TestValidator.predicate(
      `reason descending: record ${i} >= record ${i - 1}`,
      reasonDesc.data[i].reason >= reasonDesc.data[i - 1].reason,
    );
  }
  // 11. Test sorting by reason (asc)
  const reasonAsc =
    await api.functional.ecommerceMall.admin.variants.inventory_records.index(
      adminLoginConnection,
      {
        variantId: variants[0].id,
        body: {
          sort_by: "reason",
          sort_order: "asc",
          limit: 100,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(reasonAsc);
  // Verify records are sorted by reason ascending
  for (let i = 1; i < reasonAsc.data.length; i++) {
    TestValidator.predicate(
      `reason ascending: record ${i} >= record ${i - 1}`,
      reasonAsc.data[i].reason >= reasonAsc.data[i - 1].reason,
    );
  }
}
