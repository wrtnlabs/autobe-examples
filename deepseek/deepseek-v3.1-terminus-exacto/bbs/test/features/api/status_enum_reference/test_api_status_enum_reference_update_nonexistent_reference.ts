import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardStatusEnumReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnumReference";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_status_enum_reference_update_nonexistent_reference(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as admin and update connection headers
  const authResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // Update admin connection with authorization token
  adminConnection.headers = {
    Authorization: `Bearer ${authResult.token.access}`,
  };
  // Generate valid statusEnumId
  const statusEnumId = typia.random<string & tags.Format<"uuid">>();
  // Generate non-existent referenceId
  const nonExistentReferenceId = typia.random<string & tags.Format<"uuid">>();
  // Create valid update body with realistic table and column names
  const updateBody = {
    referenced_table: `discussion_board_${RandomGenerator.alphabets(8).toLowerCase()}`,
    referenced_column: `${RandomGenerator.alphabets(6).toLowerCase()}_id`,
  } satisfies IDiscussionBoardStatusEnumReference.IUpdate;
  // Attempt to update non-existent reference and expect 404 error
  await TestValidator.httpError(
    "update non-existent reference should return 404",
    404,
    async () => {
      await api.functional.discussionBoard.admin.status_enums.references.update(
        adminConnection,
        {
          statusEnumId,
          referenceId: nonExistentReferenceId,
          body: updateBody,
        },
      );
    },
  );
}
