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
 * Test that an administrator cannot approve a seller who has been rejected.
 *
 * This test validates the seller approval workflow by:
 * 1. Creating an admin account
 * 2. Creating a seller account (initially in 'pending' status)
 * 3. Rejecting the seller via admin endpoint
 * 4. Attempting to approve the rejected seller
 * 5. Verifying the approval fails with appropriate error
 *
 * This ensures rejected sellers cannot be directly approved and must reapply.
 */
export async function test_api_seller_approval_cannot_approve_rejected_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(adminEmail),
      password: typia.assert<string & tags.MinLength<8> & tags.MaxLength<128>>(adminPassword),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerJoin);
  // 3. Reject the seller using admin credentials
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(adminEmail),
      password: typia.assert<string & tags.MinLength<8> & tags.MaxLength<128>>(adminPassword),
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  const rejectedSeller =
    await api.functional.ecommerceMall.admin.sellers.reject(
      adminLoginConnection,
      {
        sellerId: sellerJoin.id,
        body: {
          rejection_reason: "Business verification failed",
        } satisfies IEcommerceMallSeller.IUpdate,
      },
    );
  typia.assert(rejectedSeller);
  // 4. Verify seller is now rejected
  TestValidator.equals(
    "seller approval status is rejected",
    rejectedSeller.approval_status,
    "rejected",
  );
  // 5. Attempt to approve the rejected seller (should fail)
  await TestValidator.error("cannot approve rejected seller", async () => {
    await api.functional.ecommerceMall.admin.sellers.approve(
      adminLoginConnection,
      {
        sellerId: sellerJoin.id,
      },
    );
  });
}