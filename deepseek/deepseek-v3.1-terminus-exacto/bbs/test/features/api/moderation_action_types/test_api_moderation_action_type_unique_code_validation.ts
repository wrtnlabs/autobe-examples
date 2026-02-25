import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardModerationActionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationActionType";
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
import { generate_random_discussion_board_super_admin_moderation_action_types_create } from "../../../generate/generate_random_discussion_board_super_admin_moderation_action_types_create";
import { prepare_random_discussion_board_moderation_action_type } from "../../../prepare/prepare_random_discussion_board_moderation_action_type";

export async function test_api_moderation_action_type_unique_code_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create first super admin connection
  const superAdmin1Connection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdmin1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create second super admin connection
  const superAdmin2Connection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdmin2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test unique code validation with first admin
  const uniqueCode = RandomGenerator.alphaNumeric(8);
  // First creation should succeed
  const firstActionType =
    await generate_random_discussion_board_super_admin_moderation_action_types_create(
      superAdmin1Connection,
      {
        body: {
          code: uniqueCode,
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          requires_reason: false,
          is_active: true,
        } satisfies IDiscussionBoardModerationActionType.ICreate,
      },
    );
  typia.assert(firstActionType);
  // Attempt to create duplicate with same admin - should fail
  await TestValidator.error("duplicate code same admin", async () => {
    await generate_random_discussion_board_super_admin_moderation_action_types_create(
      superAdmin1Connection,
      {
        body: {
          code: uniqueCode,
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          requires_reason: true,
          is_active: true,
        } satisfies IDiscussionBoardModerationActionType.ICreate,
      },
    );
  });
  // Attempt to create duplicate with different admin - should also fail
  await TestValidator.error("duplicate code different admin", async () => {
    await generate_random_discussion_board_super_admin_moderation_action_types_create(
      superAdmin2Connection,
      {
        body: {
          code: uniqueCode,
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          requires_reason: false,
          is_active: true,
        } satisfies IDiscussionBoardModerationActionType.ICreate,
      },
    );
  });
  // Test different code format scenarios
  const codeFormats = [
    RandomGenerator.alphaNumeric(6),
    `action_${RandomGenerator.alphaNumeric(4)}`,
    `TYPE-${RandomGenerator.alphaNumeric(3)}`,
  ];
  for (const code of codeFormats) {
    // Create unique action type
    const actionType =
      await generate_random_discussion_board_super_admin_moderation_action_types_create(
        superAdmin1Connection,
        {
          body: {
            code: code,
            name: RandomGenerator.paragraph({ sentences: 2 }),
            description: RandomGenerator.paragraph({ sentences: 3 }),
            requires_reason: RandomGenerator.pick([true, false]),
            is_active: true,
          } satisfies IDiscussionBoardModerationActionType.ICreate,
        },
      );
    typia.assert(actionType);
    // Verify duplicate prevention
    await TestValidator.error(`duplicate code format: ${code}`, async () => {
      await generate_random_discussion_board_super_admin_moderation_action_types_create(
        superAdmin1Connection,
        {
          body: {
            code: code,
            name: RandomGenerator.paragraph({ sentences: 2 }),
            description: RandomGenerator.paragraph({ sentences: 3 }),
            requires_reason: RandomGenerator.pick([true, false]),
            is_active: true,
          } satisfies IDiscussionBoardModerationActionType.ICreate,
        },
      );
    });
  }
}
