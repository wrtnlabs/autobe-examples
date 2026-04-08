import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
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
import { generate_random_ecommerce_mall_admin_admin_sellers_suspend } from "../../../generate/generate_random_ecommerce_mall_admin_admin_sellers_suspend";
import { prepare_random_ecommerce_mall_seller_suspension } from "../../../prepare/prepare_random_ecommerce_mall_seller_suspension";

/**
 * Test that an admin cannot suspend their own seller account.
 *
 * Validates the platform's self-protection mechanism preventing administrators from suspending their own seller accounts. This test ensures business logic integrity by blocking self-sabotage actions. The test creates an admin account and a seller account with the same email address, then verifies that attempting to suspend the seller's own account through the admin interface returns a 403 Forbidden error.
 *
 * 1. Register an admin account with a unique email address.
 * 2. Register a seller account using the SAME email address as the admin.
 * 3. Login as the admin to obtain authentication tokens.
 * 4. Approve the pending seller registration (required before suspension is allowed).
 * 5. Attempt to suspend the seller account using the admin session.
 * 6. Validates that the API returns 403 Forbidden error with message about self-suspension being prohibited.
 */
export async function test_api_seller_suspension_own_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register an admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Register a seller account with the SAME email as admin
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: adminEmail, // Same email as admin!
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // 3. Login as admin
  const loggedInAdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(loggedInAdminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 4. Approve the pending seller
  const approvedSeller =
    await api.functional.ecommerceMall.admin.admin.sellers.approve(
      loggedInAdminConnection,
      {
        sellerId: seller.id,
      },
    );
  typia.assert(approvedSeller);
  // 5. Attempt to suspend the seller (which belongs to the same admin)
  await TestValidator.httpError(
    "admin cannot suspend own seller account",
    403,
    async () =>
      await api.functional.ecommerceMall.admin.admin.sellers.suspend(
        loggedInAdminConnection,
        {
          sellerId: approvedSeller.id,
          body: {
            reason: "Policy violation test",
          } satisfies IEcommerceMallSellerSuspension.ICreate,
        },
      ),
  );
}
