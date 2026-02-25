import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportedContent";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_reported_content_retrieval_authorization_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // Description:
  // Test that the endpoint GET /communityPlatform/moderator/reports/{reportId}/reportedContents/{reportedContentId}
  // returns authorization errors for unauthenticated or unauthorized access.
  // 1. Create a moderator via authorize_moderator_join to obtain authorized connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorJoinInfo = await authorize_moderator_join(
    { host: connection.host },
    { body: {} },
  );
  moderatorConnection.headers = {
    Authorization: moderatorJoinInfo.token.access,
  };
  // 2. Generate random UUIDs for reportId and reportedContentId
  const reportId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const reportedContentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to access the endpoint WITHOUT any authorization headers
  await TestValidator.httpError(
    "unauthenticated access forbidden",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.moderator.reports.reportedContents.at(
        { host: connection.host }, // base connection without auth headers
        {
          reportId,
          reportedContentId,
        },
      );
    },
  );
  // 4. Attempt to access the endpoint WITH a connection with invalid authorization token
  const fakeAuthConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: "Bearer invalid.token" },
  };
  await TestValidator.httpError(
    "unauthorized access forbidden with invalid token",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.moderator.reports.reportedContents.at(
        fakeAuthConnection,
        {
          reportId,
          reportedContentId,
        },
      );
    },
  );
  // 5. Confirm that access with valid moderator token succeeds (sanity check)
  const validResponse =
    await api.functional.communityPlatform.moderator.reports.reportedContents.at(
      moderatorConnection,
      {
        reportId,
        reportedContentId,
      },
    );
  typia.assert(validResponse);
}
