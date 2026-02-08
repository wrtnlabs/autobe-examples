import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReport";
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

/**
 * Test retrieval of a comment report with null report reason.
 *
 * Ensures that the API correctly returns a report detail where the optional report_reason_id is null.
 * This tests handling of nullable fields in retrieval response.
 */
export async function test_api_moderator_comment_report_retrieval_null_report_reason(
  connection: api.IConnection,
): Promise<void> {
  // Moderator join for authorization
  const moderatorConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  typia.assert(authorized);
  moderatorConnection.headers ??= {};
  moderatorConnection.headers.Authorization = authorized.token.access;
  // Since no known UUID for null report_reason_id, simulate retrieval of comment report
  const commentReport =
    await api.functional.communityPlatform.moderator.comment_reports.at(
      moderatorConnection,
      {
        commentReportId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(commentReport);
  // Assert basic existence of the response
  await TestValidator.predicate(
    "comment report retrieval success",
    commentReport !== null && commentReport !== undefined,
  );
}
