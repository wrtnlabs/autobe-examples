import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
import type { IEcommerceMallShopProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShopProfile";
import type { IEcommerceMallShopProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShopProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller profile update success path with admin approval workflow.
 *
 * Validates the complete workflow from seller registration through admin approval to profile update.
 * Ensures that the profile update creates a snapshot of the previous state and that the
 * updated profile values are correctly returned.
 *
 * Test Steps:
 * 1. Seller registers with approval_status='pending'
 * 2. Admin approves the seller registration
 * 3. Seller updates shop profile with shop_name, shop_description, and logo_url
 * 4. Verify profile update response contains new values
 * 5. Verify snapshot was created with previous default values
 * 6. Verify updated_at timestamp is recent
 */
export async function test_api_seller_profile_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins with pending approval
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(seller);
  TestValidator.equals(
    "seller approval status is pending",
    seller.approval_status,
    "pending",
  );
  // 2. Admin joins and logs in
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
    },
  });
  const adminLoginResult = await authorize_administrator_login(
    adminConnection,
    {
      body: {
        email: seller.email,
        password: sellerPassword,
        ip: typia.random<string & tags.Format<"ipv4">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(adminLoginResult);
  // 3. Admin approves seller (using seller.id as requestId)
  const approvalResponse =
    await api.functional.ecommerceMall.administrator.seller_approvals.update(
      adminConnection,
      {
        requestId: seller.id,
        body: {
          status: "approved",
        },
      },
    );
  typia.assert(approvalResponse);
  // 4. Seller logs in after approval
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerAfterLogin = await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      ip: typia.random<string & tags.Format<"ipv4">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAfterLogin);
  // 5. Seller updates shop profile
  const updateBody = {
    shop_name: "My Shop",
    shop_description: "Great products and services",
    logo_url: "https://example.com/logo.png",
  } satisfies IEcommerceMallShopProfile.IUpdate;
  const updatedProfile =
    await api.functional.ecommerceMall.seller.seller_profile.update(
      sellerLoginConnection,
      {
        body: updateBody,
      },
    );
  typia.assert(updatedProfile);
  // 6. Verify profile values updated
  TestValidator.equals(
    "shop name matches update",
    updatedProfile.shop_name,
    "My Shop",
  );
  TestValidator.equals(
    "shop description matches update",
    updatedProfile.shop_description,
    "Great products and services",
  );
  TestValidator.equals(
    "logo url matches update",
    updatedProfile.logo_url,
    "https://example.com/logo.png",
  );
  // 7. Verify snapshot was created
  TestValidator.equals("snapshot exists", updatedProfile.snapshots.length, 1);
  const snapshot = updatedProfile.snapshots[0];
  typia.assert(snapshot);
  // Snapshot should have previous default/empty values
  TestValidator.equals(
    "snapshot has previous shop_name (empty string)",
    snapshot.shop_name,
    "",
  );
  TestValidator.equals(
    "snapshot has previous shop_description (null)",
    snapshot.shop_description,
    null,
  );
  TestValidator.equals(
    "snapshot has previous logo_url (null)",
    snapshot.logo_url,
    null,
  );
  // 8. Verify updated_at timestamp is recent
  const updateTimestamp = new Date(updatedProfile.updated_at);
  const now = new Date();
  const diffMs = now.getTime() - updateTimestamp.getTime();
  TestValidator.predicate(
    "updated_at timestamp is recent (within 1 minute)",
    diffMs < 60 * 1000,
  );
}