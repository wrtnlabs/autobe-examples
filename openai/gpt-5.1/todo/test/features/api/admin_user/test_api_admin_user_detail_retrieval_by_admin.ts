import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";

export async function test_api_admin_user_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register Admin A using /auth/adminUser/join to obtain authorized context
  const joinBody = typia.random<ITodoAppAdminUser.IJoin>();

  const authorized: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Call detail endpoint for Admin A using its own id
  const detail: ITodoAppAdminUser =
    await api.functional.todoApp.adminUser.adminUsers.at(connection, {
      adminUserId: authorized.id,
    });
  typia.assert(detail);

  // 3. Cross-check identity and metadata fields between authorized and detail
  TestValidator.equals(
    "admin id from detail matches join response",
    detail.id,
    authorized.id,
  );
  TestValidator.equals(
    "admin email from detail matches join response",
    detail.email,
    authorized.email,
  );
  TestValidator.equals(
    "admin display_name from detail matches join response",
    detail.display_name ?? null,
    authorized.display_name ?? null,
  );
  TestValidator.equals(
    "admin status from detail matches join response",
    detail.status,
    authorized.status,
  );
  TestValidator.equals(
    "failed_login_count from detail matches join response",
    detail.failed_login_count,
    authorized.failed_login_count,
  );
  TestValidator.equals(
    "last_login_at from detail matches join response",
    detail.last_login_at ?? null,
    authorized.last_login_at ?? null,
  );
  TestValidator.equals(
    "created_at from detail matches join response",
    detail.created_at,
    authorized.created_at,
  );
  TestValidator.equals(
    "updated_at from detail matches join response",
    detail.updated_at,
    authorized.updated_at,
  );
  TestValidator.equals(
    "deleted_at from detail matches join response",
    detail.deleted_at ?? null,
    authorized.deleted_at ?? null,
  );

  // 4. Fresh account business expectations
  TestValidator.equals(
    "newly joined admin should have failed_login_count 0",
    detail.failed_login_count,
    0,
  );
  TestValidator.equals(
    "newly joined admin should not be logically deleted",
    detail.deleted_at ?? null,
    null,
  );
}
