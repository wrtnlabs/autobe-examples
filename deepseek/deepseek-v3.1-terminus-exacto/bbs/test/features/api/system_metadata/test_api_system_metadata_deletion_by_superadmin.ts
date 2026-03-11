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

export async function test_api_system_metadata_deletion_by_superadmin(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super admin
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Create system metadata record
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
  // Verify the record exists
  TestValidator.predicate("metadata record created", metadata.id !== undefined);
  // Delete the metadata record
  await api.functional.discussionBoard.superAdmin.system_metadata.erase(
    superAdminConnection,
    {
      metadataId: metadata.id,
    },
  );
  // Confirm deletion by attempting to retrieve it (should return 404)
  // Note: Since there's no GET endpoint available in the provided API functions,
  // we'll verify deletion by ensuring the record cannot be accessed through
  // any available means. The successful deletion without errors is our primary validation.
  // Additional validation: Attempt to delete the same record again should fail
  await TestValidator.error(
    "metadata should not exist for second deletion",
    async () => {
      await api.functional.discussionBoard.superAdmin.system_metadata.erase(
        superAdminConnection,
        {
          metadataId: metadata.id,
        },
      );
    },
  );
}
