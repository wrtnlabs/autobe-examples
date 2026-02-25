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

export async function test_api_administrator_retrieve_super_admin_details(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as a super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(superAdmin);
  // Step 2: Create a second super administrator to query
  const targetSuperAdminConnection: api.IConnection = { host: connection.host };
  const targetSuperAdmin = await authorize_super_admin_join(
    targetSuperAdminConnection,
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
  typia.assert(targetSuperAdmin);
  // Step 3: Retrieve the second super administrator's details
  const retrieved =
    await api.functional.discussionBoard.superAdmin.administrators.at(
      superAdminConnection,
      {
        administratorId: targetSuperAdmin.id,
      },
    );
  typia.assert(retrieved);
  // Step 4: Validate response structure and correctness
  TestValidator.equals("ID matches target", retrieved.id, targetSuperAdmin.id);
  TestValidator.predicate(
    "has permission_level",
    retrieved.permission_level.length > 0,
  );
  TestValidator.predicate(
    "has assignment_date",
    retrieved.assignment_date.length > 0,
  );
  TestValidator.equals("admin field is null", retrieved.admin, null);
  TestValidator.predicate(
    "superAdmin field is non-null",
    retrieved.superAdmin !== null,
  );
  TestValidator.predicate("has section", retrieved.section !== undefined);
  TestValidator.predicate("has created_at", retrieved.created_at.length > 0);
  TestValidator.predicate("has updated_at", retrieved.updated_at.length > 0);
  TestValidator.equals(
    "deleted_at is null for active admin",
    retrieved.deleted_at,
    null,
  );
}
