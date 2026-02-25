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
import { generate_random_discussion_board_super_admin_administrators_create } from "../../../generate/generate_random_discussion_board_super_admin_administrators_create";
import { prepare_random_discussion_board_super_admin } from "../../../prepare/prepare_random_discussion_board_super_admin";

export async function test_api_administrator_promotion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Create a regular administrator assignment
  const regularAdmin =
    await generate_random_discussion_board_super_admin_administrators_create(
      superAdminConnection,
      {
        body: {
          permission_level: "regular",
          admin_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IDiscussionBoardSuperAdmin.ICreate,
      },
    );
  typia.assert(regularAdmin);
  // 3. Promote the regular administrator to super administrator
  const promotedAdmin =
    await api.functional.discussionBoard.superAdmin.administrators.promote(
      superAdminConnection,
      {
        administratorId: regularAdmin.id,
        body: {
          confirmed: true,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardSuperAdmin.IPromote,
      },
    );
  typia.assert(promotedAdmin);
  // 4. Validate promotion was successful
  TestValidator.equals(
    "permission level should be updated",
    promotedAdmin.permission_level,
    "super",
  );
  TestValidator.predicate(
    "assignment date should be populated",
    promotedAdmin.assignment_date !== null &&
      promotedAdmin.assignment_date !== undefined,
  );
  TestValidator.equals(
    "id should remain the same",
    promotedAdmin.id,
    regularAdmin.id,
  );
}
