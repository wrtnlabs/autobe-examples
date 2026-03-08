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
 * Test administrator rejection of an already-approved seller.
 *
 * This test validates the business rule that only pending seller applications
 * can be rejected. When an administrator attempts to reject a seller who is
 * already in 'approved' status, the system should return a 409 Conflict error.
 *
 * Test Flow:
 * 1. Create and authenticate as an administrator
 * 2. Create a seller account (initially in 'pending' status)
 * 3. Approve the seller (changes status to 'approved')
 * 4. Attempt to reject the already-approved seller
 * 5. Verify the rejection fails with 409 Conflict error
 */
export async function test_api_seller_rejection_already_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() as string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Create a seller account (initially in 'pending' status)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() as string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerJoin);
  const sellerId: string & tags.Format<"uuid"> = sellerJoin.id;
  // 3. Approve the seller (changes status from 'pending' to 'approved')
  const approvedSeller =
    await api.functional.ecommerceMall.admin.sellers.approve(adminConnection, {
      sellerId,
    });
  typia.assert(approvedSeller);
  TestValidator.equals(
    "seller approval status",
    approvedSeller.approval_status,
    "approved",
  );
  // 4. Attempt to reject the already-approved seller
  // This should fail with 409 Conflict error
  await TestValidator.httpError(
    "rejection of already-approved seller should fail with 409 Conflict",
    409,
    async () => {
      await api.functional.ecommerceMall.admin.sellers.reject(adminConnection, {
        sellerId,
        body: {
          rejection_reason: "Seller already approved, cannot reject",
        } satisfies IEcommerceMallSeller.IUpdate,
      });
    },
  );
}