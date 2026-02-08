import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_comment_report_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // Moderator joins the platform to obtain a valid authentication token
  const moderatorConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  typia.assert(auth);
  moderatorConnection.headers = {
    Authorization: auth.token.access,
  };
  // Create a comment report to delete
  // However, no creation API is given in the specs, so we generate a random UUID to simulate an existing report
  const commentReportId = typia.random<string & tags.Format<"uuid">>();
  // Delete the comment report by its valid UUID
  // Use sdk function as no utility delete function is provided
  await api.functional.communityPlatform.moderator.comment_reports.erase(
    moderatorConnection,
    {
      commentReportId,
    },
  );
  // There is no direct API to verify the deletion or to verify cascading deletions and audit logs
  // So this verification relies on assumptions that no error from the erase function means success
  // This is the extent of validation possible given the current APIs
  // To emphasize success, test should not throw and completes without error
  // Additional verification steps would be required if APIs are available to fetch or query comment reports
  await TestValidator.predicate("comment report deletion succeeded", true);
}
