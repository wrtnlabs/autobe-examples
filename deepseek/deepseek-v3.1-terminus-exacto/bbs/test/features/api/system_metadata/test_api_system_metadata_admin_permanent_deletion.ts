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

export async function test_api_system_metadata_admin_permanent_deletion(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Create a system metadata record
  const metadata =
    await generate_random_discussion_board_admin_system_metadata_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          value: RandomGenerator.alphabets(8),
          data_type: "string",
          scope: "global",
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardSystemMetadatum.ICreate,
      },
    );
  typia.assert(metadata);
  // Verify the record was created successfully
  TestValidator.equals(
    "metadata id should be valid uuid",
    typeof metadata.id,
    "string",
  );
  TestValidator.predicate(
    "metadata should have status type",
    metadata.statusType !== undefined,
  );
  // Perform permanent deletion
  await api.functional.discussionBoard.admin.system_metadata.erase(
    adminConnection,
    {
      metadataId: metadata.id,
    },
  );
  // Verify deletion is permanent by attempting to delete the same record again
  // This should result in a 404 error since the record no longer exists
  await TestValidator.httpError(
    "deleting non-existent metadata should return 404",
    404,
    async () => {
      await api.functional.discussionBoard.admin.system_metadata.erase(
        adminConnection,
        {
          metadataId: metadata.id,
        },
      );
    },
  );
}
