import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestOfCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerSuspension";
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
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_admin_admin_seller_suspensions_create } from "../../../generate/generate_random_ecommerce_mall_admin_admin_seller_suspensions_create";
import { prepare_random_ecommerce_mall_seller_suspension } from "../../../prepare/prepare_random_ecommerce_mall_seller_suspension";

export async function test_api_seller_suspension_filter_by_restored_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create superAdmin account and login
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminPassword = RandomGenerator.alphaNumeric(16) as string &
    tags.Format<"password">;
  const superAdminJoinConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(
    superAdminJoinConnection,
    {
      body: {
        email: superAdminEmail,
        password: superAdminPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(superAdmin);
  // 2. Create admin account (login as existing admin for approval)
  const adminConnection: api.IConnection = { host: connection.host };
  // Login with test admin credentials
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234" as string & tags.Format<"password">,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 3. Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16) as string &
    tags.Format<"password">;
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // 4. Login as seller to verify seller ID
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const loggedInSeller = await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  typia.assert(loggedInSeller);
  // 5. Admin suspends the seller
  const suspension =
    await api.functional.ecommerceMall.admin.admin.seller_suspensions.create(
      adminConnection,
      {
        body: {
          sellerId: loggedInSeller.id,
          reason: "Policy violation - selling prohibited items",
        } satisfies IEcommerceMallSellerSuspension.ICreate,
      },
    );
  typia.assert(suspension);
  // 6. Admin restores the suspension
  const restoredSuspension =
    await api.functional.ecommerceMall.admin.admin.seller_suspensions.restore(
      adminConnection,
      {
        suspensionId: suspension.id,
        body: {
          restoredReason: "Seller has addressed the policy violation",
        } satisfies IEcommerceMallSellerSuspension.IRestore,
      },
    );
  typia.assert(restoredSuspension);
  // 7. Call list endpoint with status='restored' filter
  const restoredList =
    await api.functional.ecommerceMall.admin.admin.seller_suspensions.index(
      adminConnection,
      {
        body: {
          status: "restored",
        } satisfies IEcommerceMallSellerSuspension.IRequest,
      },
    );
  typia.assert(restoredList);
  // 8. Verify only restored suspensions are returned (restored_at NOT NULL)
  TestValidator.predicate(
    "restored list not empty",
    restoredList.data.length > 0,
  );
  // Find our suspension in the list
  const ourSuspension = restoredList.data.find((s) => s.id === suspension.id);
  TestValidator.equals(
    "our suspension found in restored list",
    ourSuspension !== undefined,
    true,
  );
  if (ourSuspension) {
    // Verify restored_at is NOT NULL
    TestValidator.equals(
      "restored_at is not null",
      ourSuspension.restored_at !== null,
      true,
    );
    // Verify restored_reason is populated
    TestValidator.equals(
      "restored_reason is populated",
      ourSuspension.restored_reason !== null &&
        ourSuspension.restored_reason !== undefined,
      true,
    );
    TestValidator.equals(
      "restored_reason matches",
      ourSuspension.restored_reason,
      "Seller has addressed the policy violation",
    );
    // Verify restored_by admin info is populated
    TestValidator.equals(
      "restored_by is populated",
      ourSuspension.restored_by !== null &&
        ourSuspension.restored_by !== undefined,
      true,
    );
  }
}
