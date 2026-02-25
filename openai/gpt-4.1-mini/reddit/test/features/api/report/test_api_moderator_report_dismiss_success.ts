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

export async function test_api_moderator_report_dismiss_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. User join and login
  const userJoinConnection: api.IConnection = { host: connection.host };
  const userJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
    displayName: RandomGenerator.name(1),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies ICommunityPlatformUser.IJoin;
  const userAuthorized = await authorize_user_join(userJoinConnection, {
    body: userJoinBody,
  });
  typia.assert(userAuthorized);
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_login(userConnection, {
    body: {
      email: userJoinBody.email,
      password: userJoinBody.password,
    } satisfies ICommunityPlatformUser.ILogin,
  });
  // 2. Moderator join and login
  const moderatorJoinConnection: api.IConnection = { host: connection.host };
  const moderatorJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(1),
    displayName: RandomGenerator.name(1),
    bio: null,
    avatarUrl: null,
  } satisfies ICommunityPlatformModerator.IJoin;
  const moderatorAuthorized = await authorize_moderator_join(
    moderatorJoinConnection,
    { body: moderatorJoinBody },
  );
  typia.assert(moderatorAuthorized);
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_login(moderatorConnection, {
    body: {
      email: moderatorJoinBody.email,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformModerator.ILogin,
  });
  // 3. User creates a report
  const reportBodyRandom = typia.random<ICommunityPlatformReport.ICreate>();
  const userReport = await api.functional.communityPlatform.user.reports.create(
    userConnection,
    { body: reportBodyRandom },
  );
  typia.assert(userReport);
  // 4. Moderator dismisses the report
  const dismissedReport =
    await api.functional.communityPlatform.moderator.reports.dismiss(
      moderatorConnection,
      { reportId: userReport.id },
    );
  typia.assert(dismissedReport);
  // 5. Validate dismissal status
  TestValidator.equals("report status", dismissedReport.status, "dismissed");
  TestValidator.equals("report id", dismissedReport.id, userReport.id);
}
