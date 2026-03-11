import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardStatusType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusType";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemMetadatum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_system_metadata_create } from "../../../generate/generate_random_discussion_board_super_admin_system_metadata_create";
import { prepare_random_discussion_board_system_metadatum } from "../../../prepare/prepare_random_discussion_board_system_metadatum";

/**
 * Test duplicate prevention mechanism for name+scope combination.
 * 1. Authenticate as superAdmin and create a configuration with specific name and scope.
 * 2. Attempt to create another configuration with exactly the same name and scope - should fail.
 * 3. Test case variations: same name different scope should succeed,
 *    different name same scope should succeed.
 * 4. Validate the system properly assigns active status_type_id based on
 *    configuration category.
 */
export async function test_api_system_metadata_create_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Create first configuration
  const name = RandomGenerator.alphabets(10);
  const scope = "global" as const;
  const dataType = "string" as const;
  const firstConfig =
    await api.functional.discussionBoard.superAdmin.system_metadata.create(
      superAdminConnection,
      {
        body: {
          name,
          value: RandomGenerator.paragraph({ sentences: 2 }),
          data_type: dataType,
          scope,
          description: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardSystemMetadatum.ICreate,
      },
    );
  typia.assert(firstConfig);
  // Validate status_type_id assignment (should be active)
  TestValidator.predicate(
    "first config has active status",
    firstConfig.statusType.is_active,
  );
  TestValidator.equals(
    "status type is associated",
    typeof firstConfig.status_type_id,
    "string",
  );
  // 3. Attempt duplicate: same name + same scope → should fail
  await TestValidator.error(
    "duplicate name+scope should be rejected",
    async () => {
      await api.functional.discussionBoard.superAdmin.system_metadata.create(
        superAdminConnection,
        {
          body: {
            name,
            value: RandomGenerator.paragraph({ sentences: 3 }),
            data_type: dataType,
            scope,
            description: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IDiscussionBoardSystemMetadatum.ICreate,
        },
      );
    },
  );
  // 4. Case variation A: Same name, different scope → should succeed
  const differentScope = "production" as const;
  const sameNameDiffScope =
    await api.functional.discussionBoard.superAdmin.system_metadata.create(
      superAdminConnection,
      {
        body: {
          name,
          value: RandomGenerator.paragraph({ sentences: 3 }),
          data_type: "integer" as const,
          scope: differentScope,
          description: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardSystemMetadatum.ICreate,
      },
    );
  typia.assert(sameNameDiffScope);
  TestValidator.predicate(
    "same name different scope has active status",
    sameNameDiffScope.statusType.is_active,
  );
  // 4. Case variation B: Different name, same scope → should succeed
  const differentName = RandomGenerator.alphabets(12);
  const diffNameSameScope =
    await api.functional.discussionBoard.superAdmin.system_metadata.create(
      superAdminConnection,
      {
        body: {
          name: differentName,
          value: RandomGenerator.paragraph({ sentences: 3 }),
          data_type: "boolean" as const,
          scope,
          description: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardSystemMetadatum.ICreate,
      },
    );
  typia.assert(diffNameSameScope);
  TestValidator.predicate(
    "different name same scope has active status",
    diffNameSameScope.statusType.is_active,
  );
  // Final validation: all three configurations have distinct IDs
  const ids = [firstConfig.id, sameNameDiffScope.id, diffNameSameScope.id];
  TestValidator.equals("all IDs are unique", new Set(ids).size, 3);
}
