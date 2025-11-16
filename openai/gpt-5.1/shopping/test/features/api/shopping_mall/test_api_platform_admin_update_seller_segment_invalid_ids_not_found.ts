import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderSellerSegment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSellerSegment";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_platform_admin_update_seller_segment_invalid_ids_not_found(
  connection: api.IConnection,
) {
  /**
   * Validate that updating a non-existent seller segment by ID fails safely.
   *
   * This test simulates a platform administrator attempting to update a seller
   * segment using an orderId and sellerSegmentId pair that does not correspond
   * to any real record. The API must respond with an error and not perform any
   * updates.
   *
   * Business goals:
   *
   * - Path parameters must be validated so that invalid or non-existent
   *   identifiers do not silently create or modify data.
   * - Platform admin must see a proper error when trying to update a seller
   *   segment that does not belong to any order in the system.
   * - No side effects must occur when identifiers are invalid.
   */

  // 1. Register a platform admin and become authenticated.
  const platformAdminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/signup",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Construct obviously invalid IDs for order and seller segment.
  //    Use random UUIDs that are extremely unlikely to exist.
  const invalidOrderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const invalidSellerSegmentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Prepare a valid update payload for a seller segment.
  const updateBody = {
    reconciliation_status: "in_review",
    admin_notes: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IShoppingMallOrderSellerSegment.IUpdate;

  // 4. Call the update endpoint with invalid IDs and assert that it fails.
  await TestValidator.error(
    "updating non-existent seller segment must fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.orders.sellerSegments.update(
        connection,
        {
          orderId: invalidOrderId,
          sellerSegmentId: invalidSellerSegmentId,
          body: updateBody,
        },
      );
    },
  );
}
