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
import type { IEcommercePlatformSnapshotProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotProduct";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";

/**
 * Test the complete product modification workflow with admin snapshot retrieval preparation.
 *
 * Validates the product creation and update workflow that triggers automatic snapshot creation.
 * An admin and seller are registered, the seller creates and updates a product, and the admin
 * is set up to retrieve snapshots. The product update triggers snapshot creation as per
 * business rules, capturing the before/after state of product modifications.
 *
 * Due to the absence of a snapshot listing endpoint in the available APIs, the snapshotId cannot
 * be retrieved after creation. This test demonstrates the prerequisite workflow and validates
 * the product update operation which is the trigger for snapshot creation.
 *
 * 1. Admin registers on the platform.
 * 2. Seller registers to create products.
 * 3. Seller creates a product with initial name and description.
 * 4. Seller updates the product name and description, triggering automatic snapshot creation.
 * 5. Validates the updated product reflects the new name and description.
 * 6. Confirms the product modification workflow that creates immutable snapshots.
 */
export async function test_api_product_snapshot_admin_retrieval(
  connection: api.IConnection,
) {
  // 1. Admin setup - authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Seller setup - authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Create product with initial values using utility function
  const originalName = RandomGenerator.name(2);
  const originalDescription = RandomGenerator.paragraph({ sentences: 2 });
  const product: IEcommercePlatformProduct =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {
        body: {
          name: originalName,
          description: originalDescription,
        } satisfies DeepPartial<IEcommercePlatformProduct.ICreate>,
      },
    );
  typia.assert(product);
  // Validate initial product state
  TestValidator.equals("name matches initial", product.name, originalName);
  TestValidator.equals(
    "description matches initial",
    product.description,
    originalDescription,
  );
  // 4. Store the product details before update for comparison
  const productId: string & tags.Format<"uuid"> = product.id;
  // 5. Update the product to trigger snapshot creation
  // The API specification states that upon successful update, an immutable snapshot
  // of the previous state is automatically created before applying changes.
  const updatedName = "Updated " + RandomGenerator.name(3);
  const updatedDescription =
    "Updated: " + RandomGenerator.paragraph({ sentences: 3 });
  const updatedProduct: IEcommercePlatformProduct =
    await api.functional.ecommercePlatform.seller.products.update(
      sellerConnection,
      {
        productId: product.id,
        body: {
          name: updatedName,
          description: updatedDescription,
        } satisfies IEcommercePlatformProduct.IUpdate,
      },
    );
  typia.assert(updatedProduct);
  // 6. Validate the updated product reflects the changes
  // The snapshot would capture namePrevious=originalName, nameCurrent=updatedName
  TestValidator.equals(
    "name matches updated",
    updatedProduct.name,
    updatedName,
  );
  TestValidator.equals(
    "description matches updated",
    updatedProduct.description,
    updatedDescription,
  );
  // Verify the product ID remains the same after update
  TestValidator.equals("product ID unchanged", updatedProduct.id, productId);
  // 7. Verify timestamp was updated
  TestValidator.predicate(
    "updatedAt is different from createdAt",
    updatedProduct.updated_at !== updatedProduct.created_at,
  );
}
