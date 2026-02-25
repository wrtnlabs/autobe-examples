import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a fresh connection for admin registration
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate random admin credentials
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardAdmin.IJoin;
  // Register new admin
  const adminProfile: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.discussionBoard.auth.admin.join(adminConnection, {
      body: joinInput,
    });
  typia.assert(adminProfile);
  // Verify admin profile structure and values
  TestValidator.equals("email matches", adminProfile.email, joinInput.email);
  TestValidator.equals(
    "display_name matches",
    adminProfile.display_name,
    joinInput.display_name,
  );
  TestValidator.predicate(
    "is_super_admin is false by default",
    () => adminProfile.is_super_admin === false,
  );
  TestValidator.predicate(
    "is_active is true by default",
    () => adminProfile.is_active === true,
  );
  TestValidator.predicate("has valid UUID id", () =>
    /^[0-9a-f-]{36}$/i.test(adminProfile.id),
  );
  // Verify token structure
  TestValidator.equals(
    "access token exists",
    adminProfile.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "refresh token exists",
    adminProfile.token.refresh.length > 0,
    true,
  );
  TestValidator.predicate(
    "expired_at is set",
    () =>
      adminProfile.token.expired_at !== null &&
      adminProfile.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "refreshable_until is set",
    () =>
      adminProfile.token.refreshable_until !== null &&
      adminProfile.token.refreshable_until !== undefined,
  );
  // Verify timestamps exist
  TestValidator.predicate(
    "created_at is set",
    () =>
      adminProfile.created_at !== null && adminProfile.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is set",
    () =>
      adminProfile.updated_at !== null && adminProfile.updated_at !== undefined,
  );
  // Verify timestamps are valid ISO date-time format
  TestValidator.predicate(
    "created_at is valid date-time",
    () => !isNaN(Date.parse(adminProfile.created_at!)),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    () => !isNaN(Date.parse(adminProfile.updated_at!)),
  );
  // Verify promoted_by_id is null for new admin
  TestValidator.equals(
    "promoted_by_id is null for new admin",
    adminProfile.promoted_by_id,
    null,
  );
  TestValidator.equals(
    "promotedBy is null for new admin",
    adminProfile.promotedBy,
    null,
  );
}
