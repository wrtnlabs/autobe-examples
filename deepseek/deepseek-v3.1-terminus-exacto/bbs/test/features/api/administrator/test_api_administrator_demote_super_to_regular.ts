import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGradeChange";
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
import { generate_random_discussion_board_super_admin_administrators_demote } from "../../../generate/generate_random_discussion_board_super_admin_administrators_demote";
import { prepare_random_discussion_board_administrator_grade_change } from "../../../prepare/prepare_random_discussion_board_administrator_grade_change";

export async function test_api_administrator_demote_super_to_regular(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate primary super administrator (performer)
  const performerConnection: api.IConnection = { host: connection.host };
  const performer = await authorize_super_admin_join(performerConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & typia.tags.Format<"uri">>(),
      referrer: typia.random<string & typia.tags.Format<"uri">>(),
      ip: typia.random<string & typia.tags.Format<"ipv4">>(),
    },
  });
  typia.assert(performer);
  // Step 2: Create target super administrator to be demoted
  const targetConnection: api.IConnection = { host: connection.host };
  const target = await authorize_super_admin_join(targetConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & typia.tags.Format<"uri">>(),
      referrer: typia.random<string & typia.tags.Format<"uri">>(),
      ip: typia.random<string & typia.tags.Format<"ipv4">>(),
    },
  });
  typia.assert(target);
  // Step 3: Execute demote operation
  const demotionReason = RandomGenerator.paragraph({ sentences: 2 });
  const response =
    await api.functional.discussionBoard.superAdmin.administrators.demote(
      performerConnection,
      {
        administratorId: target.id,
        body: {
          reason: demotionReason,
        } satisfies IDiscussionBoardAdministratorGradeChange.ICreate,
      },
    );
  typia.assert(response);
  // Step 4: Validate response structure and demotion effect
  // Check that admin field exists (regular administrator) and superAdmin field is null
  TestValidator.equals(
    "admin field should be present after demotion",
    response.admin !== null,
    true,
  );
  TestValidator.equals(
    "superAdmin field should be null after demotion",
    response.superAdmin,
    null,
  );
  // Verify the permission level indicates regular administrator
  TestValidator.predicate(
    "permission level should be valid",
    response.permission_level.length > 0,
  );
  // Additional validation: ensure the target's ID is referenced in the response
  TestValidator.equals("ID should match target", response.id, target.id);
}
