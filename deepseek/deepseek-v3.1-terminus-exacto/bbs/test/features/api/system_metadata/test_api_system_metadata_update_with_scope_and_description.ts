import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardStatusType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusType";
import type { IDiscussionBoardSystemMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemMetadatum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_system_metadata_create } from "../../../generate/generate_random_discussion_board_admin_system_metadata_create";
import { prepare_random_discussion_board_system_metadatum } from "../../../prepare/prepare_random_discussion_board_system_metadatum";

export async function test_api_system_metadata_update_with_scope_and_description(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create initial system metadata configuration
  const initialConfig =
    await generate_random_discussion_board_admin_system_metadata_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          value: RandomGenerator.alphaNumeric(5),
          data_type: "integer",
          scope: "development",
          description: null,
        } satisfies IDiscussionBoardSystemMetadatum.ICreate,
      },
    );
  typia.assert(initialConfig);
  // Update configuration with new scope, description, and value
  const updateBody = {
    scope: "production",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    value: RandomGenerator.alphaNumeric(6),
    version: initialConfig.version,
  } satisfies IDiscussionBoardSystemMetadatum.IUpdate;
  const updatedConfig =
    await api.functional.discussionBoard.admin.system_metadata.update(
      adminConnection,
      {
        metadataId: initialConfig.id,
        body: updateBody,
      },
    );
  typia.assert(updatedConfig);
  // Validate response contains updated fields
  TestValidator.equals("scope updated", updatedConfig.scope, "production");
  TestValidator.equals(
    "description added",
    updatedConfig.description,
    updateBody.description,
  );
  TestValidator.equals("value updated", updatedConfig.value, updateBody.value);
  TestValidator.equals(
    "data_type unchanged",
    updatedConfig.data_type,
    initialConfig.data_type,
  );
  TestValidator.equals(
    "version incremented",
    updatedConfig.version,
    initialConfig.version + 1,
  );
  TestValidator.predicate(
    "updated_at changed",
    updatedConfig.updated_at !== initialConfig.updated_at,
  );
  // Test optional description field can be removed
  const removeDescriptionBody = {
    description: null,
    version: updatedConfig.version,
  } satisfies IDiscussionBoardSystemMetadatum.IUpdate;
  const finalConfig =
    await api.functional.discussionBoard.admin.system_metadata.update(
      adminConnection,
      {
        metadataId: initialConfig.id,
        body: removeDescriptionBody,
      },
    );
  typia.assert(finalConfig);
  TestValidator.equals("description removed", finalConfig.description, null);
  TestValidator.equals(
    "version incremented again",
    finalConfig.version,
    updatedConfig.version + 1,
  );
}
