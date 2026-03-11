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

export async function test_api_system_metadata_retrieval_by_superadmin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authResult);
  // 2. Create a system metadata configuration record
  const metadataRecord =
    await generate_random_discussion_board_super_admin_system_metadata_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          value: "true",
          data_type: "boolean",
          scope: "global",
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardSystemMetadatum.ICreate,
      },
    );
  typia.assert(metadataRecord);
  // 3. Retrieve the created metadata record by ID
  const retrievedMetadata =
    await api.functional.discussionBoard.superAdmin.system_metadata.at(
      superAdminConnection,
      {
        metadataId: metadataRecord.id,
      },
    );
  typia.assert(retrievedMetadata);
  // 4. Validate that retrieved record matches created record
  TestValidator.equals(
    "metadata ID matches",
    retrievedMetadata.id,
    metadataRecord.id,
  );
  TestValidator.equals(
    "name matches",
    retrievedMetadata.name,
    metadataRecord.name,
  );
  TestValidator.equals(
    "value matches",
    retrievedMetadata.value,
    metadataRecord.value,
  );
  TestValidator.equals(
    "data_type matches",
    retrievedMetadata.data_type,
    metadataRecord.data_type,
  );
  TestValidator.equals(
    "scope matches",
    retrievedMetadata.scope,
    metadataRecord.scope,
  );
  TestValidator.equals(
    "description matches",
    retrievedMetadata.description,
    metadataRecord.description,
  );
  TestValidator.equals(
    "status_type_id matches",
    retrievedMetadata.status_type_id,
    metadataRecord.status_type_id,
  );
  TestValidator.equals(
    "version matches",
    retrievedMetadata.version,
    metadataRecord.version,
  );
  // 5. Validate statusType relation is present
  TestValidator.predicate(
    "statusType relation exists",
    retrievedMetadata.statusType !== undefined,
  );
  TestValidator.equals(
    "statusType ID matches",
    retrievedMetadata.statusType.id,
    metadataRecord.statusType.id,
  );
  // 6. Test non-existent metadata ID returns 404
  await TestValidator.httpError(
    "non-existent metadata ID returns 404",
    404,
    async () => {
      await api.functional.discussionBoard.superAdmin.system_metadata.at(
        superAdminConnection,
        {
          metadataId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
