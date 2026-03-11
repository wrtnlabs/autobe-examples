import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEAdminGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEAdminGrade";
import type { IESortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IESortOrder";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequestRequestStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequestStatus";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_account_list_super_admin_view_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first regular administrator
  const regularAdmin1Connection: api.IConnection = { host: connection.host };
  const regularAdmin1 = await authorize_admin_join(regularAdmin1Connection, {
    body: {
      email: `regular1_${typia.random<string & tags.Format<"email">>()}`,
      password: RandomGenerator.alphaNumeric(16),
      href: "https://admin.example.com/join",
      referrer: "https://admin.example.com/",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(regularAdmin1);
  // 2. Create super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_admin_join(superAdminConnection, {
    body: {
      email: `super_${typia.random<string & tags.Format<"email">>()}`,
      password: RandomGenerator.alphaNumeric(16),
      href: "https://admin.example.com/join",
      referrer: "https://admin.example.com/",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 3. Create second regular administrator
  const regularAdmin2Connection: api.IConnection = { host: connection.host };
  const regularAdmin2 = await authorize_admin_join(regularAdmin2Connection, {
    body: {
      email: `regular2_${typia.random<string & tags.Format<"email">>()}`,
      password: RandomGenerator.alphaNumeric(16),
      href: "https://admin.example.com/join",
      referrer: "https://admin.example.com/",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(regularAdmin2);
  // 4. List all admins as super admin
  const listConnection: api.IConnection = { host: connection.host };
  listConnection.headers = { Authorization: superAdmin.token.access };
  const listResult = await api.functional.ecommerceMall.admin.admins.index(
    listConnection,
    {
      body: {},
    },
  );
  typia.assert(listResult);
  // 5. Validate pagination and data structure
  TestValidator.equals("all admins returned", listResult.data.length, 3);
  TestValidator.equals(
    "pagination records count",
    listResult.pagination.records,
    3,
  );
  TestValidator.equals(
    "pagination pages count",
    listResult.pagination.pages,
    1,
  );
  // 6. Verify all created admin emails are in response
  const emailMap = new Map(
    listResult.data.map((admin) => [admin.email, admin]),
  );
  TestValidator.equals(
    "regular admin 1 visible",
    emailMap.has(regularAdmin1.email),
    true,
  );
  TestValidator.equals(
    "super admin visible",
    emailMap.has(superAdmin.email),
    true,
  );
  TestValidator.equals(
    "regular admin 2 visible",
    emailMap.has(regularAdmin2.email),
    true,
  );
  // 7. Verify all admin records have required summary fields
  listResult.data.forEach((admin) => {
    TestValidator.notEquals("admin has valid id", admin.id, null as any);
    TestValidator.notEquals("admin has valid email", admin.email, null as any);
    TestValidator.notEquals(
      "admin has valid is_banned",
      admin.is_banned,
      null as any,
    );
    TestValidator.notEquals(
      "admin has valid ban_reason",
      admin.ban_reason,
      null as any,
    );
    TestValidator.notEquals(
      "admin has valid created_at",
      admin.created_at,
      null as any,
    );
    TestValidator.notEquals(
      "admin has valid updated_at",
      admin.updated_at,
      null as any,
    );
  });
  // 8. Verify all admins have isBanned = false (newly created, not banned)
  const regularAdmin1Record = emailMap.get(regularAdmin1.email)!;
  const superAdminRecord = emailMap.get(superAdmin.email)!;
  const regularAdmin2Record = emailMap.get(regularAdmin2.email)!;
  TestValidator.equals(
    "regular admin 1 is not banned",
    regularAdmin1Record.is_banned,
    false,
  );
  TestValidator.equals(
    "super admin is not banned",
    superAdminRecord.is_banned,
    false,
  );
  TestValidator.equals(
    "regular admin 2 is not banned",
    regularAdmin2Record.is_banned,
    false,
  );
}
