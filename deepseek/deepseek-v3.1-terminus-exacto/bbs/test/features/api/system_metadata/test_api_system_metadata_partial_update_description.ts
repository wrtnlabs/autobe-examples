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
 * Test partial update scenario where only specific fields are modified.
 * 1. Create superAdmin account and authenticate
 * 2. Create system metadata record with comprehensive initial values
 * 3. Perform partial update modifying only the description field
 * 4. Verify description updated while other fields unchanged and version increments
 */
export async function test_api_system_metadata_partial_update_description(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create superAdmin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdminAuth);
  // 2. Create initial system metadata record
  const dataTypes = ["boolean", "integer", "string", "json", "float"] as const;
  const scopes = ["global", "production", "staging", "development"] as const;
  const initialMetadata =
    await generate_random_discussion_board_super_admin_system_metadata_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          value: RandomGenerator.paragraph({ sentences: 1 }),
          data_type: RandomGenerator.pick(dataTypes),
          scope: RandomGenerator.pick(scopes),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardSystemMetadatum.ICreate,
      },
    );
  typia.assert(initialMetadata);
  // 3. Perform partial update - only modify description
  const updatedDescription = RandomGenerator.paragraph({ sentences: 3 });
  const updatedMetadata =
    await api.functional.discussionBoard.superAdmin.system_metadata.update(
      superAdminConnection,
      {
        metadataId: initialMetadata.id,
        body: {
          description: updatedDescription,
          version: initialMetadata.version,
        } satisfies IDiscussionBoardSystemMetadatum.IUpdate,
      },
    );
  typia.assert(updatedMetadata);
  // 4. Validate partial update results
  TestValidator.equals(
    "id remains unchanged",
    updatedMetadata.id,
    initialMetadata.id,
  );
  TestValidator.equals(
    "name remains unchanged",
    updatedMetadata.name,
    initialMetadata.name,
  );
  TestValidator.equals(
    "value remains unchanged",
    updatedMetadata.value,
    initialMetadata.value,
  );
  TestValidator.equals(
    "data_type remains unchanged",
    updatedMetadata.data_type,
    initialMetadata.data_type,
  );
  TestValidator.equals(
    "scope remains unchanged",
    updatedMetadata.scope,
    initialMetadata.scope,
  );
  TestValidator.equals(
    "description is updated",
    updatedMetadata.description,
    updatedDescription,
  );
  TestValidator.equals(
    "version increments by 1",
    updatedMetadata.version,
    initialMetadata.version + 1,
  );
  TestValidator.notEquals(
    "updated_at changes",
    updatedMetadata.updated_at,
    initialMetadata.updated_at,
  );
}
