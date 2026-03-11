import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

/**
 * Test successful retrieval of all active discussion board sections by a super administrator.
 * Validate that the endpoint returns a section with proper structure.
 */
export async function test_api_super_admin_sections_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Retrieve section using super admin connection
  const section =
    await api.functional.discussionBoard.superAdmin.sections.at(
      superAdminConnection,
    );
  typia.assert(section);
  // Validate section structure
  typia.assert(section);
  // Validate UUID format
  TestValidator.predicate(
    "id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      section.id,
    ),
  );
  // Validate name is non-empty string
  TestValidator.predicate("name is non-empty", section.name.length > 0);
  // Validate created_at is valid date-time
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(new Date(section.created_at).getTime()),
  );
  // description can be null or string
  if (section.description !== null) {
    TestValidator.predicate(
      "description is string if not null",
      typeof section.description === "string",
    );
  }
}
