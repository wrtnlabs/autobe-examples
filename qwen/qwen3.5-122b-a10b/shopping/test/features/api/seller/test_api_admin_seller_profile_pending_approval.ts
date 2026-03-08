import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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

/**
 * Test that an administrator can retrieve profile information for a seller with pending approval status.
 * This scenario validates that the approval_status field correctly shows 'pending' for sellers awaiting administrator review.
 * The test should verify that the administrator can view the complete profile including shop_name, shop_description, and timestamps,
 * which are needed for the administrator to make an informed approval decision.
 * Confirm that sensitive authentication credentials are excluded from the response even for pending sellers.
 */
export async function test_api_admin_seller_profile_pending_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.assert<string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>>(
        typia.random<string & tags.Format<"email">>(),
      ),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create seller account (automatically gets approval_status='pending')
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.assert<string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>>(
        typia.random<string & tags.Format<"email">>(),
      ),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerJoin);
  // 3. Retrieve seller profile using admin connection
  const sellerProfile = await api.functional.ecommerceMall.admin.sellers.at(
    adminConnection,
    {
      sellerId: sellerJoin.seller.id,
    },
  );
  typia.assert(sellerProfile);
  // 4. Validate approval status is pending
  TestValidator.equals(
    "approval status is pending",
    sellerProfile.approval_status,
    "pending",
  );
  // 5. Validate shop profile information exists
  TestValidator.equals(
    "shop name matches",
    sellerProfile.shop_name,
    sellerJoin.shop_name,
  );
  TestValidator.predicate(
    "shop description exists",
    () =>
      sellerProfile.shop_description !== null &&
      sellerProfile.shop_description !== undefined,
  );
  // 6. Validate seller ID matches
  TestValidator.equals(
    "seller ID matches",
    sellerProfile.id,
    sellerJoin.seller.id,
  );
  // 7. Validate account status is active (default for new sellers)
  TestValidator.equals(
    "account status is active",
    sellerProfile.account_status,
    "active",
  );
}