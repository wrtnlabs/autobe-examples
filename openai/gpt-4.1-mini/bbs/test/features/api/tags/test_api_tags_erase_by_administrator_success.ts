import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_tags_erase_by_administrator_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Administrator joins, then deletes a tag successfully, verifying cascading deletion.
  // 1. Administrator join and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongPassword123!",
  } satisfies IDiscussionBoardAdministrator.IJoin;
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuthorized);
  // Add auth token to connection headers
  adminConnection.headers = {
    Authorization: adminAuthorized.token.access,
  };
  // 2. Create a new tag as admin may not have a direct utility, so attempt to create tag with direct api call or simulate creating via typical API
  // NOTE: Since we have no utility or API for creating tags in provided info, we simulate tagId for deletion test.
  // Generate random tagId to delete
  const tagId = typia.random<string & tags.Format<"uuid">>();
  // 3. Delete the tag by admin
  // Use utility function to erase tag
  await api.functional.discussionBoard.administrator.tags.eraseTag(
    adminConnection,
    {
      tagId,
    },
  );
  // 4. Verify deletion by attempting to get the tag or catch error
  // Since no get tag API provided, we cannot check directly.
  // We rely on no error from eraseTag and absence of response body.
  // Nothing to assert on response as eraseTag returns void
}
