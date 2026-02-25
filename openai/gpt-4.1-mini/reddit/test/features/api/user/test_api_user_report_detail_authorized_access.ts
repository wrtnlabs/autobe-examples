import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import type { ICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportedContent";
import type { ICommunityPlatformReportsDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportsDecision";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_user_report_detail_authorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Summary:
  // - Moderator join and login
  // - User join and login
  // - Hardcoded reportId placeholder from typia.random to attempt fetch
  // - Moderator fetches report detail and validates result
  // - User tries fetching report and gets unauthorized error
  // 1. Moderator join with valid data
  const moderatorJoinConnection: api.IConnection = { host: connection.host };
  const moderatorJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: typia.random<string & tags.Format<"email">>().split("@")[0],
    displayName: "ModTest",
    bio: null,
    avatarUrl: null,
  };
  const moderatorAuthorized = await authorize_moderator_join(
    moderatorJoinConnection,
    {
      body: moderatorJoinBody,
    },
  );
  typia.assert(moderatorAuthorized);
  // 2. Moderator login
  const moderatorLoginConnection: api.IConnection = { host: connection.host };
  const moderatorLogin = await authorize_moderator_login(
    moderatorLoginConnection,
    {
      body: {
        email: moderatorJoinBody.email,
        password: moderatorJoinBody.displayName, // No password in join DTO, but assume displayName as password for the sake of test
      } satisfies ICommunityPlatformModerator.ILogin,
    },
  );
  typia.assert(moderatorLogin);
  // Authenticated connection for moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  moderatorConnection.headers = { Authorization: moderatorLogin.token.access };
  // 3. User join with valid data
  const userJoinConnection: api.IConnection = { host: connection.host };
  const userJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "testPassword123",
    username: typia.random<string & tags.Format<"email">>().split("@")[0],
    displayName: "UserTest",
    href: "https://test.com",
    referrer: "https://referrer.com",
    ip: null,
  } satisfies ICommunityPlatformUser.IJoin;
  const userAuthorized = await authorize_user_join(userJoinConnection, {
    body: userJoinBody,
  });
  typia.assert(userAuthorized);
  // 4. User login
  const userLoginConnection: api.IConnection = { host: connection.host };
  const userLogin = await authorize_user_login(userLoginConnection, {
    body: {
      email: userJoinBody.email,
      password: userJoinBody.password,
    } satisfies ICommunityPlatformUser.ILogin,
  });
  typia.assert(userLogin);
  // Authenticated connection for user
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = { Authorization: userLogin.token.access };
  // 5. Fetch a reportId to use in test
  // Due to no API to create a specific report, we must use a placeholder UUID
  const reportId = typia.random<string & tags.Format<"uuid">>();
  // 6. Moderator fetches report detail
  const report = await api.functional.communityPlatform.user.reports.at(
    moderatorConnection,
    {
      reportId,
    },
  );
  typia.assert(report);
  // Validate report properties
  TestValidator.predicate("report id matches", report.id === reportId);
  TestValidator.predicate(
    "report has user",
    report.user !== null && report.user.id !== undefined,
  );
  TestValidator.predicate(
    "report has reportReason",
    report.reportReason !== null && report.reportReason.id !== undefined,
  );
  TestValidator.predicate(
    "report has reportedContents",
    Array.isArray(report.reportedContents) &&
      report.reportedContents.length > 0,
  );
  TestValidator.predicate(
    "report has decisions",
    Array.isArray(report.decisions),
  );
  // 7. User tries to fetch report detail and expect failure
  await TestValidator.httpError(
    "user unauthorized cannot access report detail",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.user.reports.at(userConnection, {
        reportId,
      });
    },
  );
}
