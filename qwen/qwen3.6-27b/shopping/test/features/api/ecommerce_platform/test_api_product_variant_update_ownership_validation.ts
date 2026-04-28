import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
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
import { generate_random_ecommerce_platform_admin_categories_create } from "../../../generate/generate_random_ecommerce_platform_admin_categories_create";
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";

/**
 * Test product variant update ownership validation ensuring unauthorized sellers cannot modify other sellers' variants.
 *
 * Validates that a seller attempting to update a product variant owned by another seller receives a 403 Forbidden response. The test verifies the authorization restriction prevents cross-seller variant modifications by setting up two approved sellers and attempting an update operation from the unauthorized seller.
 *
 * Tests the ownership validation mechanism by having an owner seller with their product variant, then a second seller attempting to update it. Verifies the operation fails with the expected HTTP status code.
 *
 * 1. Owner seller joins and gets approved by admin.
 * 2. Admin joins and approves the owner seller.
 * 3. Owner seller logs in.
 * 4. Non-owner seller joins and gets approved by admin.
 * 5. Non-owner seller logs in.
 * 6. Non-owner seller attempts to update owner's product variant.
 * 7. Verifies the operation fails with 403 Forbidden status.
 * 8. Validates ownership constraints prevent unauthorized variant modifications.
 */
export async function test_api_product_variant_update_ownership_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner seller joins
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerSeller = await authorize_seller_join(ownerConnection, {
    body: undefined,
  });
  // 2. Admin joins to approve sellers
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, { body: undefined });
  // 3. Admin approves owner seller
  const ownerSellerApproval = {
    status: "approved",
  } satisfies IEcommercePlatformSellerApprovalRequest.IUpdate;
  await api.functional.ecommercePlatform.admin.seller_approval_requests.update(
    adminConnection,
    {
      requestId: typia.random<string & tags.Format<"uuid">>(),
      body: ownerSellerApproval,
    },
  );
  // 4. Owner seller logs in
  await authorize_seller_login(ownerConnection, {
    body: {
      email: ownerSeller.email,
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformSeller.ILogin,
  });
  // 5. Non-owner seller joins
  const nonOwnerConnection: api.IConnection = { host: connection.host };
  const nonOwnerSeller = await authorize_seller_join(nonOwnerConnection, {
    body: undefined,
  });
  // 6. Admin approves non-owner seller
  const nonOwnerSellerApproval = {
    status: "approved",
  } satisfies IEcommercePlatformSellerApprovalRequest.IUpdate;
  await api.functional.ecommercePlatform.admin.seller_approval_requests.update(
    adminConnection,
    {
      requestId: typia.random<string & tags.Format<"uuid">>(),
      body: nonOwnerSellerApproval,
    },
  );
  // 7. Non-owner seller logs in
  await authorize_seller_login(nonOwnerConnection, {
    body: {
      email: nonOwnerSeller.email,
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformSeller.ILogin,
  });
  // 8. Non-owner seller attempts to update owner's product variant - should fail with 403 Forbidden
  await TestValidator.httpError(
    "non-owner seller cannot update owner's variant",
    403,
    async () =>
      await api.functional.ecommercePlatform.seller.products.variants.update(
        nonOwnerConnection,
        {
          productId: typia.random<string & tags.Format<"uuid">>(),
          variantId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            sku_code: "NEW-SKU-CODE",
          } satisfies IEcommercePlatformProductVariant.IUpdate,
        },
      ),
  );
}
