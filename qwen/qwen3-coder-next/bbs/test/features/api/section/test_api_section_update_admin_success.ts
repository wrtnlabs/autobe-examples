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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_section_update_admin_success(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Step 1: Admin joins the system
  const adminInfo = await api.functional.discussionBoard.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardAdmin.IJoin,
    },
  );
  typia.assert(adminInfo);
  // Step 2: Create admin-specific connection with token
  const authConnection: api.IConnection = {
    host: connection.host,
    headers: {
      authorization: adminInfo.token.access,
    },
  };
  // Generate random section ID for testing
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Update the section with new name and description
  const updatedSection =
    await api.functional.discussionBoard.admin.sections.update(authConnection, {
      sectionId: sectionId,
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IDiscussionBoardSection.IUpdate,
    });
  typia.assert(updatedSection);
  // Step 4: Verify the response contains the updated information
  TestValidator.predicate("section has valid ID", () =>
    /^[0-9a-f-]{36}$/i.test(updatedSection.id),
  );
  TestValidator.predicate(
    "name is not empty",
    () => Boolean(updatedSection.name && updatedSection.name.length > 0),
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    () => !isNaN(new Date(updatedSection.created_at).getTime()),
  );
}