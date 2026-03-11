import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallUserBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test user ban listing with default pagination parameters.
 * 1. Register a new admin account
 * 2. Login as admin
 * 3. Fetch banned users with default pagination
 * 4. Validate pagination structure and data fields
 */
export async function test_api_user_ban_list_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and register new admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Login as admin to obtain authentication tokens
  const loginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(loginConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 3. Call PATCH /ecommerceMall/admin/user-bans with default pagination
  const result = await api.functional.ecommerceMall.admin.user_bans.index(
    loginConnection,
    {
      body: {} satisfies IEcommerceMallUserBan.IRequest,
    },
  );
  typia.assert(result);
  // 4. Verify response structure
  TestValidator.predicate(
    "response has pagination",
    result.pagination !== null,
  );
  TestValidator.predicate("response has data", Array.isArray(result.data));
  // 5. Verify pagination metadata fields
  TestValidator.predicate(
    "has current page",
    typeof result.pagination.current === "number",
  );
  TestValidator.predicate(
    "has limit",
    typeof result.pagination.limit === "number",
  );
  TestValidator.predicate(
    "has records",
    typeof result.pagination.records === "number",
  );
  TestValidator.predicate(
    "has pages",
    typeof result.pagination.pages === "number",
  );
  // 6. Verify ban summary fields
  if (result.data.length > 0) {
    const ban = result.data[0];
    TestValidator.equals("has id", typeof ban.id, "string");
    TestValidator.equals("has user_id", typeof ban.user_id, "string");
    TestValidator.equals("has user_email", typeof ban.user_email, "string");
    TestValidator.equals(
      "has user_type",
      ["customer", "seller"].includes(ban.user_type),
      true,
    );
    TestValidator.equals("has admin_id", typeof ban.admin_id, "string");
    TestValidator.equals("has admin_email", typeof ban.admin_email, "string");
    TestValidator.equals("has banned_at", typeof ban.banned_at, "string");
    TestValidator.equals(
      "has unban_at",
      ban.unban_at === null || typeof ban.unban_at === "string",
      true,
    );
    TestValidator.equals(
      "has is_active",
      typeof ban.is_active === "boolean",
      true,
    );
    TestValidator.equals(
      "has created_at",
      typeof ban.created_at === "string",
      true,
    );
    TestValidator.equals(
      "has updated_at",
      typeof ban.updated_at === "string",
      true,
    );
    TestValidator.equals(
      "has deleted_at",
      ban.deleted_at === null || typeof ban.deleted_at === "string",
      true,
    );
    // 7. Verify first ban has most recent timestamp (most recent first ordering)
    if (result.data.length > 1) {
      const firstBanDate = new Date(result.data[0].banned_at).getTime();
      const secondBanDate = new Date(result.data[1].banned_at).getTime();
      TestValidator.predicate(
        "first ban is most recent",
        firstBanDate >= secondBanDate,
      );
    }
  }
}
