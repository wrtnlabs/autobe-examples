import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_post_report_retrieval_by_moderator_success_and_access_control(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful retrieval of an existing post report by a moderator.
  // Create moderator connection and authenticate by joining
  const moderatorConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_moderator_join(moderatorConnection, {
    body: {}, // ICommunityPlatformModerator.IJoin is empty
  });
  typia.assert(auth);
  moderatorConnection.headers = { Authorization: auth.token.access };
  // Use a valid postReportId to retrieve (simulate creating a report is assumed, here we generate a UUID to simulate retrieval)
  // Ideally, a real post report would be created but since no create API is provided, we use a random valid UUID for the test
  const validPostReportId = typia.random<string & tags.Format<"uuid">>();
  const postReport =
    await api.functional.communityPlatform.moderator.post_reports.at(
      moderatorConnection,
      { postReportId: validPostReportId },
    );
  typia.assert(postReport);
  // Validate the retrieved postReport contains required fields if any (schema is empty though, so just assert the entire structure passes typia)
  // Scenario 2: Attempt to retrieve a post report which does not exist.
  // Use new moderator connection
  const moderatorConnection2: api.IConnection = { host: connection.host };
  const auth2 = await authorize_moderator_join(moderatorConnection2, {
    body: {},
  });
  typia.assert(auth2);
  moderatorConnection2.headers = { Authorization: auth2.token.access };
  const nonExistentId = "00000000-0000-0000-0000-000000000000" as const;
  await TestValidator.httpError("non-existent post report", 404, async () => {
    await api.functional.communityPlatform.moderator.post_reports.at(
      moderatorConnection2,
      {
        postReportId: nonExistentId,
      },
    );
  });
  // Scenario 3: Access control test - attempt to retrieve post report without moderator authorization.
  // Use base connection (not authorized)
  await TestValidator.httpError(
    "unauthorized access without token",
    401,
    async () => {
      await api.functional.communityPlatform.moderator.post_reports.at(
        connection,
        {
          postReportId: validPostReportId,
        },
      );
    },
  );
}
