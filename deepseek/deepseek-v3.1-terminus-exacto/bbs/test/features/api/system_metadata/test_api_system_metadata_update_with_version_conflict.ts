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

export async function test_api_system_metadata_update_with_version_conflict(
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
  // Create initial system metadata record
  const metadata =
    await generate_random_discussion_board_super_admin_system_metadata_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          value: RandomGenerator.alphabets(20),
          data_type: "string",
          scope: "global",
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardSystemMetadatum.ICreate,
      },
    );
  typia.assert(metadata);
  // First successful update with correct version
  const firstUpdateBody = {
    name: RandomGenerator.alphabets(10),
    value: RandomGenerator.alphabets(20),
    version: metadata.version,
  } satisfies IDiscussionBoardSystemMetadatum.IUpdate;
  const updatedMetadata =
    await api.functional.discussionBoard.superAdmin.system_metadata.update(
      superAdminConnection,
      {
        metadataId: metadata.id,
        body: firstUpdateBody,
      },
    );
  typia.assert(updatedMetadata);
  // Verify version incremented
  TestValidator.equals(
    "version should increment",
    updatedMetadata.version,
    metadata.version + 1,
  );
  // Second update attempt with outdated version (should fail)
  const secondUpdateBody = {
    name: RandomGenerator.alphabets(10),
    value: RandomGenerator.alphabets(20),
    version: metadata.version, // Outdated version (not the updated one)
  } satisfies IDiscussionBoardSystemMetadatum.IUpdate;
  await TestValidator.error("should fail with version conflict", async () => {
    await api.functional.discussionBoard.superAdmin.system_metadata.update(
      superAdminConnection,
      {
        metadataId: metadata.id,
        body: secondUpdateBody,
      },
    );
  });
}
