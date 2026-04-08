import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityAdmin";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_list_primary_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register 4 admin accounts with different characteristics
  const admins: IRedditCommunityAdmin.IAuthorized[] = [];
  // Admin 1: System Admin with display_name
  {
    const adminConnection: api.IConnection = { host: connection.host };
    const admin1 = await authorize_admin_join(adminConnection, {
      body: {
        email: "admin1@example.com",
        password: "1234",
        display_name: "System Admin",
      } satisfies IRedditCommunityAdmin.IJoin,
    });
    typia.assert(admin1);
    admins.push(admin1);
  }
  // Admin 2: Moderator Lead with display_name
  {
    const adminConnection: api.IConnection = { host: connection.host };
    const admin2 = await authorize_admin_join(adminConnection, {
      body: {
        email: "admin2@example.com",
        password: "1234",
        display_name: "Moderator Lead",
      } satisfies IRedditCommunityAdmin.IJoin,
    });
    typia.assert(admin2);
    admins.push(admin2);
  }
  // Admin 3: Admin with display_name (is_active defaults to true)
  {
    const adminConnection: api.IConnection = { host: connection.host };
    const admin3 = await authorize_admin_join(adminConnection, {
      body: {
        email: "inactive@example.com",
        password: "1234",
        display_name: "Inactive Admin",
      } satisfies IRedditCommunityAdmin.IJoin,
    });
    typia.assert(admin3);
    admins.push(admin3);
  }
  // Admin 4: Null display_name
  {
    const adminConnection: api.IConnection = { host: connection.host };
    const admin4 = await authorize_admin_join(adminConnection, {
      body: {
        email: "another@example.com",
        password: "1234",
        display_name: null,
      } satisfies IRedditCommunityAdmin.IJoin,
    });
    typia.assert(admin4);
    admins.push(admin4);
  }
  // 2. Call admin list endpoint with default parameters
  const listConnection: api.IConnection = { host: connection.host };
  // First login as one of the admins to authenticate
  await authorize_admin_login(listConnection, {
    body: {
      email: admins[0].email,
      password: "1234",
    } satisfies IRedditCommunityAdmin.ILogin,
  });
  const response = await api.functional.redditCommunity.admin.admins.index(
    listConnection,
    {
      body: {}, // Default parameters
    },
  );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 20);
  TestValidator.equals(
    "pagination records count",
    response.pagination.records,
    4,
  );
  TestValidator.equals("pagination pages count", response.pagination.pages, 1);
  // 4. Validate data array contains exactly 4 records
  TestValidator.equals("admin list count", response.data.length, 4);
  // 5. Validate each record has correct structure
  for (let i = 0; i < response.data.length; i++) {
    const admin = response.data[i];
    // Validate id is UUID
    typia.assert<string & tags.Format<"uuid">>(admin.id);
    // Validate email exists
    TestValidator.predicate("email is string", typeof admin.email === "string");
    // Validate display_name is string or null
    TestValidator.predicate(
      "display_name is string or null",
      admin.display_name === null || typeof admin.display_name === "string",
    );
    // Validate is_active is boolean
    TestValidator.predicate(
      "is_active is boolean",
      typeof admin.is_active === "boolean",
    );
    // Validate created_at is date-time
    typia.assert<string & tags.Format<"date-time">>(admin.created_at);
    // Validate updated_at is date-time
    typia.assert<string & tags.Format<"date-time">>(admin.updated_at);
    // Validate deleted_at is null or date-time
    if (admin.deleted_at !== null) {
      typia.assert<string & tags.Format<"date-time">>(admin.deleted_at);
    }
  }
  // 6. Validate records are sorted by created_at descending (newest first)
  for (let i = 0; i < response.data.length - 1; i++) {
    const current = response.data[i];
    const next = response.data[i + 1];
    TestValidator.predicate(
      "created_at sorted descending",
      current.created_at >= next.created_at,
    );
  }
  // 7. Validate deleted_at is null for all records (default filters out soft-deleted)
  for (const admin of response.data) {
    TestValidator.equals("deleted_at is null", admin.deleted_at, null);
  }
  // 8. Validate password_hash is NEVER included in response
  for (const admin of response.data) {
    const adminKeys = Object.keys(admin);
    TestValidator.predicate(
      "no password_hash field",
      !adminKeys.includes("password_hash"),
    );
  }
}
