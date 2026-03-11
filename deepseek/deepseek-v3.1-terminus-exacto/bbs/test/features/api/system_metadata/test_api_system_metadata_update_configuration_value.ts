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

export async function test_api_system_metadata_update_configuration_value(
  connection: api.IConnection,
): Promise<void> {
  // Create superAdmin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create initial system metadata record with random data
  const initialMetadata =
    await generate_random_discussion_board_super_admin_system_metadata_create(
      superAdminConnection,
      {
        body: typia.random<IDiscussionBoardSystemMetadatum.ICreate>(),
      },
    );
  typia.assert(initialMetadata);
  // Prepare update data with consistent data types
  const updateData: IDiscussionBoardSystemMetadatum.IUpdate = {
    value: typia.random<string>(),
    data_type: "string", // Keep consistent with string value
    scope: typia.random<string>(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    version: initialMetadata.version,
  };
  // Perform update operation
  const updatedMetadata =
    await api.functional.discussionBoard.superAdmin.system_metadata.update(
      superAdminConnection,
      {
        metadataId: initialMetadata.id,
        body: updateData,
      },
    );
  typia.assert(updatedMetadata);
  // Validate updated fields
  TestValidator.equals(
    "value updated",
    updatedMetadata.value,
    updateData.value,
  );
  TestValidator.equals(
    "data_type updated",
    updatedMetadata.data_type,
    updateData.data_type,
  );
  TestValidator.equals(
    "scope updated",
    updatedMetadata.scope,
    updateData.scope,
  );
  TestValidator.equals(
    "description updated",
    updatedMetadata.description,
    updateData.description,
  );
  // Validate version incremented
  TestValidator.equals(
    "version incremented",
    updatedMetadata.version,
    initialMetadata.version + 1,
  );
  // Validate unchanged fields remain the same
  TestValidator.equals("id unchanged", updatedMetadata.id, initialMetadata.id);
  TestValidator.equals(
    "status_type_id unchanged",
    updatedMetadata.status_type_id,
    initialMetadata.status_type_id,
  );
  TestValidator.equals(
    "name unchanged",
    updatedMetadata.name,
    initialMetadata.name,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedMetadata.created_at,
    initialMetadata.created_at,
  );
  // Validate timestamp updated
  TestValidator.notEquals(
    "updated_at changed",
    updatedMetadata.updated_at,
    initialMetadata.updated_at,
  );
}
