import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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

export async function test_api_super_admin_profile_update_success(
  connection: api.IConnection,
): Promise<void> {
  // Store password for later login
  const password = RandomGenerator.alphaNumeric(16);
  // Create super admin connection and join
  const superAdminConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(joined);
  // Login with the created super admin credentials using the same connection
  const loggedIn = await authorize_super_admin_login(superAdminConnection, {
    body: {
      email: joined.email,
      password: password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.ILogin,
  });
  typia.assert(loggedIn);
  // Update profile with new permission level
  const updateBody = {
    permission_level: RandomGenerator.alphabets(10),
  } satisfies IDiscussionBoardSuperAdmin.IUpdate;
  const updated =
    await api.functional.discussionBoard.superAdmin.super_admins.profile.update(
      superAdminConnection,
      { body: updateBody },
    );
  typia.assert(updated);
  // Validate the update was successful
  TestValidator.equals(
    "permission level matches input",
    updated.permission_level,
    updateBody.permission_level,
  );
  TestValidator.equals("super admin ID matches", updated.id, joined.id);
  TestValidator.predicate(
    "updated_at is newer than created_at",
    new Date(updated.updated_at) > new Date(updated.created_at),
  );
}
