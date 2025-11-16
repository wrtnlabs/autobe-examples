import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSettings";
import type { IRedditCommunityRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRedditCommunityAdmin";

export async function test_api_admin_registration(connection: api.IConnection) {
  // 1. Admin join prerequisite
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditCommunityAdmin.ICreate;

  const adminAuthorized: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Main test: Create new admin user
  const newAdminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditCommunityRedditCommunityAdmin.ICreate;

  const newAdmin: IRedditCommunityRedditCommunityAdmin =
    await api.functional.redditCommunity.admin.redditCommunity.admins.create(
      connection,
      {
        body: newAdminBody,
      },
    );
  typia.assert(newAdmin);

  // 3. Validate returned new admin data
  TestValidator.predicate(
    "new admin id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
      newAdmin.id,
    ),
  );
  TestValidator.equals(
    "new admin email matches input",
    newAdmin.email,
    newAdminBody.email,
  );

  // 4. Validate timestamps
  TestValidator.predicate(
    "created_at has ISO 8601 format ISO",
    typeof newAdmin.created_at === "string" &&
      new Date(newAdmin.created_at).toString() !== "Invalid Date",
  );
  TestValidator.predicate(
    "updated_at has ISO 8601 format ISO",
    typeof newAdmin.updated_at === "string" &&
      new Date(newAdmin.updated_at).toString() !== "Invalid Date",
  );

  // 5. Validate deleted_at is null or undefined (soft delete support)
  TestValidator.predicate(
    "deleted_at is null or undefined",
    newAdmin.deleted_at === null || newAdmin.deleted_at === undefined,
  );
}
