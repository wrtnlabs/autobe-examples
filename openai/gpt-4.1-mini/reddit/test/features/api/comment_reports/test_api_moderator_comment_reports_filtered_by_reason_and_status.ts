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

export async function test_api_moderator_comment_reports_filtered_by_reason_and_status(
  connection: api.IConnection,
): Promise<void> {
  // Moderator setup: join and login
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorPassword = "P@ssw0rd!";
  const moderatorJoinPayload: ICommunityPlatformModerator.IJoin = {
    email: `mod_${RandomGenerator.alphaNumeric(6)}@test.com`,
    username: `mod_${RandomGenerator.name(1)}`,
    displayName: `Mod ${RandomGenerator.name(1)}`,
    bio: "Test moderator",
    avatarUrl: null,
    // Add password to join payload if exists
  };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      ...moderatorJoinPayload,
      /* password is not part of ICommunityPlatformModerator.IJoin, so
               cannot set here directly; it's handled internally by auth join API
               or preset by system in test env. If password is required to login,
               we'll use constant known password for login. */
    },
  });
  typia.assert(moderator);
  // Login with known password (we assume P@ssw0rd! is accepted for test purpose)
  await authorize_moderator_login(moderatorConnection, {
    body: {
      email: moderatorJoinPayload.email,
      password: moderatorPassword,
    },
  });
  // User setup: join only (authorization initializes token)
  const userConnection: api.IConnection = { host: connection.host };
  const userJoinPayload: ICommunityPlatformUser.IJoin = {
    email: `user_${RandomGenerator.alphaNumeric(6)}@test.com`,
    password: "userpass123",
    username: `usr_${RandomGenerator.name(1)}`,
    displayName: `User ${RandomGenerator.name(1)}`,
    href: "http://localhost/",
    referrer: "http://localhost/refer",
    ip: null,
  };
  const user = await authorize_user_join(userConnection, {
    body: userJoinPayload,
  });
  typia.assert(user);
  // Create a comment report with known reason by the user
  const reportCreated =
    await generate_random_community_platform_user_comment_reports_create(
      userConnection,
      { body: {} },
    );
  typia.assert(reportCreated);
  // Compose filter request by the report reason id and status 'pending'
  const requestBody: ICommunityPlatformCommentReport.IRequest = {
    report_reason_id: reportCreated.reportReason?.id ?? null,
    status: "pending",
    page: 1,
    limit: 10,
  };
  // Moderator fetches filtered comment reports using utility function
  const reportsPage: IPageICommunityPlatformCommentReport.ISummary =
    await api.functional.communityPlatform.moderator.commentReports.index(
      moderatorConnection,
      { body: requestBody },
    );
  typia.assert(reportsPage);
  // Validate pagination fields
  TestValidator.predicate(
    "page current is 1",
    reportsPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "page limit is 10",
    reportsPage.pagination.limit === 10,
  );
  // Validate filtered reports
  for (const report of reportsPage.data) {
    TestValidator.equals(
      "report reason id",
      report.reportReason?.id ?? null,
      requestBody.report_reason_id,
    );
    TestValidator.equals("report status", report.status, requestBody.status);
  }
}
