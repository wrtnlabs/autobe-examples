import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const joinedSuperAdmin = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(joinedSuperAdmin);
  // Retrieve the super administrator profile
  const retrievedSuperAdmin =
    await api.functional.discussionBoard.super_admins.at(superAdminConnection, {
      superAdminId: joinedSuperAdmin.id,
    });
  typia.assert(retrievedSuperAdmin);
  // Validate all expected fields are present and correct
  TestValidator.equals(
    "id matches",
    retrievedSuperAdmin.id,
    joinedSuperAdmin.id,
  );
  TestValidator.equals(
    "email matches",
    retrievedSuperAdmin.email,
    joinedSuperAdmin.email,
  );
  TestValidator.equals(
    "admin_grade is super",
    retrievedSuperAdmin.admin_grade,
    "super",
  );
  // Validate date-time formats
  const createdAt = new Date(retrievedSuperAdmin.created_at);
  const updatedAt = new Date(retrievedSuperAdmin.updated_at);
  TestValidator.predicate(
    "created_at is valid ISO date-time",
    () => !isNaN(createdAt.getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid ISO date-time",
    () => !isNaN(updatedAt.getTime()),
  );
  // Validate timestamps are recent (within last 5 minutes)
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  TestValidator.predicate(
    "created_at is recent",
    () => createdAt > fiveMinutesAgo,
  );
  TestValidator.predicate(
    "updated_at is recent",
    () => updatedAt > fiveMinutesAgo,
  );
  // Validate deleted_at is null for active account
  TestValidator.equals(
    "deleted_at should be null for active account",
    retrievedSuperAdmin.deleted_at,
    null,
  );
}
