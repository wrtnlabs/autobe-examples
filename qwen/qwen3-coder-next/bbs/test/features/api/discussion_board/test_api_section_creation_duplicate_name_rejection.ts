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
import { generate_random_discussion_board_super_admin_sections_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_section_creation_duplicate_name_rejection(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create first section with random name
  const sectionName = RandomGenerator.name(3);
  const firstSection =
    await api.functional.discussionBoard.superAdmin.sections.create(
      adminConnection,
      {
        body: {
          name: sectionName,
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(firstSection);
  // Try to create second section with same name - should fail
  await TestValidator.httpError(
    "duplicate section name should be rejected",
    409,
    async () => {
      await api.functional.discussionBoard.superAdmin.sections.create(
        adminConnection,
        {
          body: {
            name: sectionName,
            description: RandomGenerator.paragraph({ sentences: 5 }),
          } satisfies IDiscussionBoardSection.ICreate,
        },
      );
    },
  );
}
