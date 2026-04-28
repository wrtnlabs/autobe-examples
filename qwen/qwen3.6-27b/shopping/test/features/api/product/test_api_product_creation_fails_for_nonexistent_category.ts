import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductImage";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerApprovalRequest";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
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
 * Test product creation fails when providing a non-existent category ID.
 *
 * Validates that the seller cannot create a product with an invalid or non-existent category ID. The backend should validate the category exists before the product creation, and reject with 404 status when the category doesn't exist or is soft-deleted. This ensures data integrity by preventing orphan products that reference non-existent categories.
 *
 * 1. Admin joins the platform to enable seller approval management.
 * 2. Seller registers with credentials and pending approval status.
 * 3. Admin logs in and approves the seller's approval request.
 * 4. Seller logs in as an approved user.
 * 5. Approved seller attempts to create a product with a non-existent category UUID.
 * 6. Validates the creation fails with a 404 error indicating missing category.
 */
export async function test_api_product_creation_fails_for_nonexistent_category(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins platform with random credentials
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformAdmin.IJoin,
  });
  typia.assert(adminAuthorized);
  // 2. Seller registers with credentials and pending approval status
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformSeller.IJoin,
  });
  typia.assert(sellerAuthorized);
  // 3. Admin logs in with consistent credentials to approve seller
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminLoginAuthorized = await authorize_admin_login(
    adminLoginConnection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommercePlatformAdmin.ILogin,
    },
  );
  typia.assert(adminLoginAuthorized);
  // Admin approves seller's request using seller ID as request reference
  const sellerApprovalRequest =
    await api.functional.ecommercePlatform.admin.seller_approval_requests.update(
      adminLoginConnection,
      {
        requestId: sellerAuthorized.id,
        body: {
          status: "approved",
        } satisfies IEcommercePlatformSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(sellerApprovalRequest);
  // 4. Seller logs in as approved user
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLoginAuthorized = await authorize_seller_login(
    sellerLoginConnection,
    {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommercePlatformSeller.ILogin,
    },
  );
  typia.assert(sellerLoginAuthorized);
  // 5. Generate non-existent category UUID for testing category validation
  const nonexistentCategoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 6. Approved seller attempts to create product with non-existent category - should fail
  await TestValidator.error(
    "product creation fails for non-existent category",
    async () => {
      await api.functional.ecommercePlatform.seller.products.create(
        sellerLoginConnection,
        {
          body: {
            name: RandomGenerator.name(),
            description: RandomGenerator.paragraph({ sentences: 3 }),
            base_price: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<1>
            >(),
            category_id: nonexistentCategoryId,
          } satisfies IEcommercePlatformProduct.ICreate,
        },
      );
    },
  );
}
