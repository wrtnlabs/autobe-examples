import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
 * Test retrieving a pending seller's shop profile as an administrator.
 *
 * This test verifies that administrators can view seller profiles that are
 * in PENDING status before making approval decisions. The test creates a seller
 * account which automatically starts in PENDING status, then retrieves the
 * profile using the admin seller retrieval endpoint.
 *
 * Validation includes:
 * - approval_status is PENDING
 * - approvedByAdmin is null (not yet approved)
 * - Shop information (shop_name, shop_description, logo_image_url) is accessible
 */
export async function test_api_seller_profile_retrieval_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and authenticate
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
  // 2. Create seller account (automatically PENDING status)
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoinData = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(16),
    shop_name: RandomGenerator.name(),
    shop_description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_image_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.IJoin;
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: sellerJoinData,
  });
  typia.assert(sellerAuth);
  // 3. Retrieve seller profile as admin (without approving)
  const sellerProfile = await api.functional.shoppingMall.admin.sellers.at(
    adminConnection,
    {
      sellerId: sellerAuth.id,
    },
  );
  typia.assert(sellerProfile);
  // 4. Validate pending seller profile - business logic validation
  TestValidator.equals(
    "approval status is PENDING",
    sellerProfile.approval_status,
    "PENDING",
  );
  TestValidator.equals(
    "approvedByAdmin is null",
    sellerProfile.approvedByAdmin,
    null,
  );
  TestValidator.equals(
    "shop name matches",
    sellerProfile.shop_name,
    sellerJoinData.shop_name,
  );
  TestValidator.equals(
    "shop description matches",
    sellerProfile.shop_description,
    sellerJoinData.shop_description,
  );
  TestValidator.equals(
    "logo image URL matches",
    sellerProfile.logo_image_url,
    sellerJoinData.logo_image_url,
  );
  TestValidator.equals(
    "seller email matches",
    sellerProfile.email,
    sellerJoinData.email,
  );
  TestValidator.equals("suspended is false", sellerProfile.suspended, false);
  TestValidator.equals(
    "deleted_at is null (active account)",
    sellerProfile.deleted_at,
    null,
  );
}
