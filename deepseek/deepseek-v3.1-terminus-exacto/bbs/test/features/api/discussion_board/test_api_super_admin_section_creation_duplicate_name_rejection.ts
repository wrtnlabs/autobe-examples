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
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_super_admin_sections_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test super administrator section creation duplicate name rejection.
 * Verifies that section names must be unique case-insensitively.
 * Creates initial section with regular admin, then attempts duplicate with super admin.
 */
export async function test_api_super_admin_section_creation_duplicate_name_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate regular admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create initial section 'Politics' using regular admin
  const sectionName = "Politics";
  const initialSection =
    await generate_random_discussion_board_admin_sections_create(
      adminConnection,
      {
        body: {
          name: sectionName,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(initialSection);
  // 3. Create and authenticate super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 4. Attempt to create duplicate section with different casing 'politics'
  await TestValidator.error(
    "duplicate section name (case-insensitive)",
    async () => {
      await generate_random_discussion_board_super_admin_sections_create(
        superAdminConnection,
        {
          body: {
            name: "politics", // lowercase duplicate
            description: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IDiscussionBoardSection.ICreate,
        },
      );
    },
  );
  // 5. Test additional casing variations
  await TestValidator.error("duplicate section name (mixed case)", async () => {
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: "POLITICS", // uppercase duplicate
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  });
  await TestValidator.error("duplicate section name (title case)", async () => {
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: "Politics", // exact duplicate
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  });
}
