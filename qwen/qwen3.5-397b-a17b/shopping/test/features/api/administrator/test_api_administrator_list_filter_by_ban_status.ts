import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdmin";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequest";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_shopping_mall_member_admin_promotion_requests_create } from "../../../generate/generate_random_shopping_mall_member_admin_promotion_requests_create";
import { prepare_random_shopping_mall_admin_promotion_request } from "../../../prepare/prepare_random_shopping_mall_admin_promotion_request";

/**
 * Test administrator list filtering by ban status.
 *
 * Validates that super administrators can correctly filter the administrator list by ban status to find banned or active administrators. The test creates a member, promotes them to administrator, bans them, and then verifies that the ban status filter correctly returns only the expected administrators.
 *
 * Special attention is given to verifying that the banned filter correctly distinguishes between administrators with banned_at set (banned) versus null (active), and that omitting the filter returns all administrators regardless of ban status.
 *
 * 1. Super administrator registers and authenticates.
 * 2. Member registers and authenticates.
 * 3. Member submits administrator promotion request.
 * 4. Super administrator approves the promotion request, creating a regular administrator.
 * 5. Super administrator bans the newly created administrator.
 * 6. Filter with banned=true returns only the banned administrator.
 * 7. Filter with banned=false returns only active administrators (the super admin).
 * 8. Filter without banned parameter returns all administrators.
 */
export async function test_api_administrator_list_filter_by_ban_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(superAdminAuth);
  // 2. Create member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAuth);
  // 3. Member submits admin promotion request
  const promotionRequest =
    await generate_random_shopping_mall_member_admin_promotion_requests_create(
      memberConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(promotionRequest);
  // 4. Super admin approves the promotion request
  const approvedRequest =
    await api.functional.shoppingMall.superAdmin.admin_promotion_requests.update(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallAdminPromotionRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  TestValidator.equals("request approved", approvedRequest.status, "approved");
  // 5. Get the newly created administrator ID from the approved request
  // The admin is created when the request is approved, we need to find them
  const allAdminsBeforeBan =
    await api.functional.shoppingMall.superAdmin.admins.index(
      superAdminConnection,
      {
        body: {} satisfies IShoppingMallAdmin.IRequest,
      },
    );
  typia.assert(allAdminsBeforeBan);
  // Find the newly promoted admin (the one that is not the super admin)
  const newAdmin = allAdminsBeforeBan.data.find(
    (admin) => admin.grade === "regular",
  );
  TestValidator.predicate("new admin exists", newAdmin !== undefined);
  // 6. Super admin bans the newly created administrator
  const bannedAdmin =
    await api.functional.shoppingMall.superAdmin.admins.update(
      superAdminConnection,
      {
        adminId: newAdmin!.id,
        body: {
          banned_at: new Date().toISOString(),
        } satisfies IShoppingMallAdmin.IUpdate,
      },
    );
  typia.assert(bannedAdmin);
  TestValidator.predicate("admin is banned", bannedAdmin.bannedAt !== null);
  // 7. Test filter with banned=true (should return only banned administrators)
  const bannedAdmins =
    await api.functional.shoppingMall.superAdmin.admins.index(
      superAdminConnection,
      {
        body: {
          banned: true,
        } satisfies IShoppingMallAdmin.IRequest,
      },
    );
  typia.assert(bannedAdmins);
  TestValidator.predicate("has banned admins", bannedAdmins.data.length > 0);
  for (const admin of bannedAdmins.data) {
    TestValidator.predicate(
      `admin ${admin.id} is banned`,
      admin.banned_at !== null,
    );
    TestValidator.equals(
      `admin ${admin.id} status is banned`,
      admin.status,
      "banned",
    );
  }
  // 8. Test filter with banned=false (should return only active administrators)
  const activeAdmins =
    await api.functional.shoppingMall.superAdmin.admins.index(
      superAdminConnection,
      {
        body: {
          banned: false,
        } satisfies IShoppingMallAdmin.IRequest,
      },
    );
  typia.assert(activeAdmins);
  TestValidator.predicate("has active admins", activeAdmins.data.length > 0);
  for (const admin of activeAdmins.data) {
    TestValidator.predicate(
      `admin ${admin.id} is active`,
      admin.banned_at === null,
    );
    TestValidator.equals(
      `admin ${admin.id} status is active`,
      admin.status,
      "active",
    );
  }
  // 9. Test filter without banned parameter (should return all administrators)
  const allAdmins = await api.functional.shoppingMall.superAdmin.admins.index(
    superAdminConnection,
    {
      body: {} satisfies IShoppingMallAdmin.IRequest,
    },
  );
  typia.assert(allAdmins);
  TestValidator.equals(
    "total admins count",
    allAdmins.data.length,
    bannedAdmins.data.length + activeAdmins.data.length,
  );
  // Verify the banned admin is in the full list
  const bannedAdminInList = allAdmins.data.find(
    (admin) => admin.id === newAdmin!.id,
  );
  TestValidator.predicate(
    "banned admin in full list",
    bannedAdminInList !== undefined,
  );
  TestValidator.predicate(
    "banned admin has banned_at",
    bannedAdminInList!.banned_at !== null,
  );
}
