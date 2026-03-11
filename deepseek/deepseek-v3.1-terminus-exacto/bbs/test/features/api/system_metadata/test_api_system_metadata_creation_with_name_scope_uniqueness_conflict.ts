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

/**
 * Test business rule validation for name+scope uniqueness when creating system metadata.
 * Administrator authenticates via admin join. First, create a system metadata entry
 * with name 'feature.enable_search' and scope 'global'. Then attempt to create another
 * entry with the same name and scope combination (duplicate). The system should reject
 * the second creation attempt with appropriate business logic error (not input validation),
 * as name+scope combinations must be unique across the platform. Verify that the error
 * message indicates the uniqueness conflict and that only the first configuration exists
 * in the system. Testing focuses on business rule enforcement rather than HTTP schema validation.
 */
export async function test_api_system_metadata_creation_with_name_scope_uniqueness_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create first system metadata entry
  const firstMetadata =
    await api.functional.discussionBoard.admin.system_metadata.create(
      adminConnection,
      {
        body: {
          name: "feature.enable_search",
          value: "true",
          data_type: "boolean",
          scope: "global",
          description: "Enable search functionality across the platform",
        } satisfies IDiscussionBoardSystemMetadatum.ICreate,
      },
    );
  typia.assert(firstMetadata);
  // 3. Attempt to create duplicate entry with same name and scope
  await TestValidator.error(
    "duplicate name+scope combination should be rejected",
    async () => {
      await api.functional.discussionBoard.admin.system_metadata.create(
        adminConnection,
        {
          body: {
            name: "feature.enable_search",
            value: "false",
            data_type: "boolean",
            scope: "global",
            description: "Different value but same name and scope",
          } satisfies IDiscussionBoardSystemMetadatum.ICreate,
        },
      );
    },
  );
  // 4. Verify that only the first configuration exists
  // (Note: Since we don't have a list endpoint, we rely on the error validation above)
  TestValidator.equals(
    "first metadata name matches",
    firstMetadata.name,
    "feature.enable_search",
  );
  TestValidator.equals(
    "first metadata scope matches",
    firstMetadata.scope,
    "global",
  );
  TestValidator.equals(
    "first metadata value matches",
    firstMetadata.value,
    "true",
  );
}
