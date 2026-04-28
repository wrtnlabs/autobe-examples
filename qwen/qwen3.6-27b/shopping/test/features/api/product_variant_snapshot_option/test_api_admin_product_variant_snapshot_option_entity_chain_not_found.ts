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
 * Test that retrieving a snapshot variant option with a non-existent option ID returns 404, validating the entity chain protection.
 *
 * An administrator and a seller authenticate to the platform. The seller creates a product, a variant, and updates the variant to generate an immutable snapshot. The administrator retrieves the snapshot list to obtain a valid snapshot ID, then attempts to fetch a specific snapshot variant option using a valid product ID, variant ID, and snapshot ID but a deliberately non-existent option ID. The API returns a 404 error because the option does not exist under the validated snapshot variant, confirming that the chain-of-trust mechanism correctly rejects invalid option lookups.
 *
 * 1. Administrator and seller authenticate.
 * 2. Seller creates a product.
 * 3. Seller creates a variant with options.
 * 4. Seller updates the variant, generating a snapshot.
 * 5. Administrator lists snapshots for the variant to retrieve a valid snapshot ID.
 * 6. Administrator attempts to retrieve a specific snapshot variant option with a non-existent option ID.
 * 7. Validates that a 404 error is thrown.
 */
export async function test_api_admin_product_variant_snapshot_option_entity_chain_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate admin and seller
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminCredentials: IEcommercePlatformAdmin.ILogin = {
    email: adminEmail,
    password: "1234",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };
  await authorize_admin_join(adminConnection, {
    body: { email: adminEmail, password: "1234" },
  });
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerCredentials: IEcommercePlatformSeller.ILogin = {
    email: sellerEmail,
    password: "1234",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };
  await authorize_seller_join(sellerConnection, {
    body: { email: sellerEmail, password: "1234" },
  });
  // 2. Seller creates a product
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  // 3. Seller creates a variant with options
  const variant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 4. Seller updates the variant to generate a snapshot
  const updateBody = {
    sku_code: RandomGenerator.alphaNumeric(8),
  } satisfies IEcommercePlatformProductVariant.IUpdate;
  const updatedVariant =
    await api.functional.ecommercePlatform.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: updateBody,
      },
    );
  typia.assert(updatedVariant);
  // 5. Administrator lists snapshots to get a valid snapshot ID
  const snapshotsRequest =
    {} satisfies IEcommercePlatformSnapshotVariant.IRequest;
  const snapshots =
    await api.functional.ecommercePlatform.admin.products.variants.snapshots.index(
      adminConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: snapshotsRequest,
      },
    );
  typia.assert(snapshots);
  // Get the first snapshot
  const firstSnapshot = snapshots.data[0];
  typia.assert(firstSnapshot);
  // 6. Attempt to retrieve a snapshot variant option with a non-existent option ID
  const nonExistentOptionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent snapshot variant option returns 404",
    404,
    async () => {
      await api.functional.ecommercePlatform.admin.products.variants.snapshots.options.at(
        adminConnection,
        {
          productId: product.id,
          variantId: variant.id,
          snapshotId: firstSnapshot.snapshot.id,
          optionId: nonExistentOptionId,
        },
      );
    },
  );
}
