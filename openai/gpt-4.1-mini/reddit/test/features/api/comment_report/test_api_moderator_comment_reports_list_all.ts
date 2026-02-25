import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReport";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_comment_reports_create } from "../../../generate/generate_random_community_platform_user_comment_reports_create";
import { prepare_random_community_platform_comment_report } from "../../../prepare/prepare_random_community_platform_comment_report";

export async function test_api_moderator_comment_reports_list_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator join and login
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(1),
    displayName: null,
    bio: null,
    avatarUrl: null,
  } satisfies ICommunityPlatformModerator.IJoin;
  const moderator = await authorize_moderator_join(
    { host: connection.host },
    { body: moderatorJoinInput },
  );
  // Update moderatorConnection with authorization token
  moderatorConnection.headers = { Authorization: moderator.token.access };
  // 2. User join and login (for comment report creation)
  const userConnection: api.IConnection = { host: connection.host };
  const userJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
    displayName: RandomGenerator.name(1),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies ICommunityPlatformUser.IJoin;
  const user = await authorize_user_join(
    { host: connection.host },
    { body: userJoinInput },
  );
  userConnection.headers = { Authorization: user.token.access };
  // 3. Create a comment report by user
  const createdReport =
    await generate_random_community_platform_user_comment_reports_create(
      userConnection,
      {
        body: undefined,
      },
    );
  typia.assert(createdReport);
  // 4. Moderator queries comment reports with empty filter (all reports)
  const filterRequest = {
    report_reason_id: null,
    status: undefined,
    community_id: null,
    reporter_user_id: null,
    created_at_from: null,
    created_at_to: null,
    page: 1,
    limit: 20,
  } satisfies ICommunityPlatformCommentReport.IRequest;
  const response =
    await api.functional.communityPlatform.moderator.commentReports.index(
      moderatorConnection,
      {
        body: filterRequest,
      },
    );
  // 5. Validate response structure
  typia.assert(response);
  // 6. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is 1",
    response.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  // 7. Validate that returned reports array includes the created report
  const found = response.data.find((report) => report.id === createdReport.id);
  TestValidator.predicate(
    "created report is found in response data",
    found !== undefined,
  );
  if (found) {
    // 8. Validate fields in the found report
    typia.assert(found); // should conform to ICommunityPlatformCommentReport.ISummary
    // 9. Validate linked comment
    typia.assert(found.comment);
    // 10. Validate reporter user
    typia.assert(found.reporterUser);
    // 11. Validate report reason (can be null)
    if (found.reportReason !== undefined) {
      if (found.reportReason !== null) {
        typia.assert(found.reportReason);
      }
    }
  }
}
