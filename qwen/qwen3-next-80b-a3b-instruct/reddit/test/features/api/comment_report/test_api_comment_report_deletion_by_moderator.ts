import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsModerator";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
export async function test_api_comment_report_deletion_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a connection for moderator authentication
  const moderatorConnection: api.IConnection = { host: connection.host };
  // Step 2: Authenticate as moderator using authorize_moderator_join (mandatory utility function)
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(32),
    } satisfies ICommunityBbsModerator.IJoin,
  });
  typia.assert(moderator);
  // Step 3: Generate a valid reportId (assuming a test report exists with this ID in the environment)
  // Note: Since there is no report creation endpoint provided, we cannot create a report in this test.
  // We assume a report exists in the test environment with a UUID that we can delete.
  const reportId = typia.random<string & tags.Format<"uuid">>();
  // Step 4: Delete the comment report using the moderatorConnection
  // This validates that an authenticated moderator can successfully delete a report
  // API returns 204 No Content with void, so no response to validate
  await api.functional.communityBbs.moderator.comment_reports.erase(
    moderatorConnection,
    {
      reportId,
    },
  );
  // Step 5: Verification: The test passes if no error is thrown during deletion
  // This confirms the moderator is authorized and the report deletion workflow is functional
  // No additional validation possible as no GET endpoint exists to verify deletion
  // The functional call itself is the validation
}
