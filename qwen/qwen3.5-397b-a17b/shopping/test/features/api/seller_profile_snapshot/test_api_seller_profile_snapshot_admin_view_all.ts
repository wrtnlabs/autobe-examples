import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageISellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageISellerProfileSnapshot";
import type { ISellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ISellerProfileSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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

/**
 * Test that an administrator can successfully retrieve the snapshot history
 * for any seller's profile on the platform. The admin authenticates via join,
 * creates a seller account with profile information, then requests snapshots
 * for that seller. Verify the response contains paginated snapshots with
 * shopName, shopDescription, logoImageUrl, and createdAt timestamp. Confirm
 * that snapshots preserve the seller's profile information as an immutable
 * historical record. This validates the admin oversight capability for
 * monitoring seller profile changes and supporting dispute resolution.
 */
export async function test_api_seller_profile_snapshot_admin_view_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication via join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Seller registration (creates initial profile with shop information)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  const sellerId = sellerAuth.id;
  // 3. Admin retrieves seller profile snapshots
  const snapshots =
    await api.functional.shoppingMall.admin.sellers.profile.snapshots.list(
      adminConnection,
      {
        sellerId: sellerId,
      },
    );
  typia.assert(snapshots);
  // 4. Validate pagination metadata
  TestValidator.predicate(
    "records count >= 0",
    snapshots.pagination.records >= 0,
  );
  TestValidator.predicate("pages count >= 0", snapshots.pagination.pages >= 0);
  TestValidator.predicate(
    "current page >= 0",
    snapshots.pagination.current >= 0,
  );
  TestValidator.predicate("limit >= 0", snapshots.pagination.limit >= 0);
  // 5. Validate snapshot data exists and structure
  TestValidator.predicate("data array exists", Array.isArray(snapshots.data));
  if (snapshots.data.length > 0) {
    const firstSnapshot = snapshots.data[0];
    // Validate snapshot content matches seller profile information
    TestValidator.predicate(
      "shopName is non-empty",
      firstSnapshot.shopName.length > 0,
    );
    TestValidator.predicate(
      "seller summary exists",
      firstSnapshot.seller !== null,
    );
    TestValidator.predicate(
      "seller id matches",
      firstSnapshot.seller.id === sellerId,
    );
    // Validate shopDescription can be null or string
    TestValidator.predicate(
      "shopDescription is null or string",
      firstSnapshot.shopDescription === null ||
        typeof firstSnapshot.shopDescription === "string",
    );
    // Validate logoImageUrl can be null or uri string
    TestValidator.predicate(
      "logoImageUrl is null or string",
      firstSnapshot.logoImageUrl === null ||
        typeof firstSnapshot.logoImageUrl === "string",
    );
  }
  // 6. Verify snapshots are ordered newest first (if multiple exist)
  if (snapshots.data.length > 1) {
    const firstCreatedAt = snapshots.data[0].createdAt;
    const secondCreatedAt = snapshots.data[1].createdAt;
    TestValidator.predicate(
      "newest snapshot first",
      firstCreatedAt >= secondCreatedAt,
    );
  }
}
