import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductImage";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import type { IEcommercePlatformSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshot";
import type { IEcommercePlatformSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotVariant";
import type { IEcommercePlatformSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformSnapshotVariant";
import type { IPageIEcommercePlatformSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformSnapshotVariantOption";
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
import { generate_random_ecommerce_platform_seller_products_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_create";
import { generate_random_ecommerce_platform_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_variants_create";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";
import { prepare_random_ecommerce_platform_product_variant } from "../../../prepare/prepare_random_ecommerce_platform_product_variant";
import { prepare_random_ecommerce_platform_product_variant_option } from "../../../prepare/prepare_random_ecommerce_platform_product_variant_option";

/**
 * Tests the product variant snapshot option retrieval endpoint for platform administrators.
 *
 * Validates the complete audit trail hierarchy access: seller creates product and variant with
 * configurable options, seller updates the variant triggering immutable snapshot generation,
 * administrator retrieves the snapshot list to obtain valid snapshot ID, retrieves the snapshot
 * option list to obtain valid option ID, and retrieves the specific snapshot variant option via
 * the nested resource endpoint.
 *
 * Confirms complete entity chain verification — product belongs to seller, variant belongs to
 * product, snapshot belongs to variant, and option belongs to snapshot variant. The returned
 * snapshot option record contains immutable option key, value, creation timestamp, and snapshot
 * variant context reference for audit and dispute resolution purposes.
 *
 * 1. Administrator authenticates to the platform.
 * 2. Seller authenticates to the platform.
 * 3. Seller creates a product with name, description, base price, and category ID.
 * 4. Seller creates a variant with unique SKU code and an option (color: Red).
 * 5. Seller updates the variant triggering automatic snapshot generation.
 * 6. Administrator retrieves variant snapshot list to obtain valid snapshot ID.
 * 7. Administrator retrieves snapshot option list to obtain valid option ID.
 * 8. Administrator retrieves the specific snapshot variant option record.
 * 9. Validates returned snapshot option contains expected data.
 */
export async function test_api_admin_product_variant_snapshot_option_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformAdmin.ILogin,
  });
  // 2. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformSeller.ILogin,
  });
  // 3. Seller creates a product
  const product = await api.functional.ecommercePlatform.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<number>(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommercePlatformProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Seller creates a product variant with an option (color: Red)
  const variant =
    await api.functional.ecommercePlatform.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          skuCode: typia.random<string>(),
          options: ArrayUtil.repeat(
            1,
            () =>
              ({
                attributeKey: "color",
                attributeValue: "Red",
              }) satisfies IEcommercePlatformProductVariantOption.ICreate,
          ),
        } satisfies IEcommercePlatformProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 5. Seller updates the variant (triggers snapshot generation)
  const updatedVariant =
    await api.functional.ecommercePlatform.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          sku_code: typia.random<string>(),
          price: typia.random<number>(),
          options: {
            attribute_key: "color",
            attribute_value: "Blue",
          } satisfies IEcommercePlatformProductVariantOption.IUpdate,
        } satisfies IEcommercePlatformProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // 6. Admin retrieves variant snapshots list
  const snapshotsPage =
    await api.functional.ecommercePlatform.admin.products.variants.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {} satisfies IEcommercePlatformSnapshotVariant.IRequest,
      },
    );
  typia.assert(snapshotsPage);
  TestValidator.predicate("snapshots exist", snapshotsPage.data.length > 0);
  const snapshotId = snapshotsPage.data[0].id;
  // 7. Admin retrieves snapshot options list
  const optionsPage =
    await api.functional.ecommercePlatform.admin.products.variants.snapshots.options.index(
      adminConnection,
      {
        productId: product.id,
        variantId: variant.id,
        snapshotId,
        body: {} satisfies IEcommercePlatformSnapshotVariantOption.IRequest,
      },
    );
  typia.assert(optionsPage);
  TestValidator.predicate(
    "snapshot options exist",
    optionsPage.data.length > 0,
  );
  const optionId = optionsPage.data[0].id;
  // 8. Admin retrieves the specific snapshot variant option
  const snapshotOption =
    await api.functional.ecommercePlatform.admin.products.variants.snapshots.options.at(
      adminConnection,
      {
        productId: product.id,
        variantId: variant.id,
        snapshotId,
        optionId,
      },
    );
  typia.assert(snapshotOption);
  // 9. Validate the snapshot variant option data
  TestValidator.equals("option ID matches", snapshotOption.id, optionId);
  TestValidator.equals(
    "option belongs to snapshot variant",
    snapshotOption.snapshotVariant.id,
    snapshotId,
  );
  TestValidator.predicate("option key is valid", snapshotOption.key.length > 0);
  TestValidator.predicate(
    "option value is valid",
    snapshotOption.value.length > 0,
  );
}
