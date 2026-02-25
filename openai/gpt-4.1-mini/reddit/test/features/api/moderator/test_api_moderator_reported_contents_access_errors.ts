import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import type { ICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportedContent";
import type { ICommunityPlatformReportsDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportsDecision";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReportedContent";
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

export async function test_api_moderator_reported_contents_access_errors(
  connection: api.IConnection,
): Promise<void> {
  // Test error scenarios for moderator accessing reported contents with invalid
  // report IDs or without proper authorization. Validate unauthorized access,
  // invalid UUID, and non-existent report ID responses. Ensure guests or
  // unauthorized users cannot retrieve sensitive moderation data. Validate
  // authorization and error handling comprehensively.
  // Create moderator credentials for join
  const moderatorPassword = RandomGenerator.alphaNumeric(16);
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = `mod_${RandomGenerator.alphabets(8)}`;
  // Create and authorize moderator for valid access
  const moderatorJoinConnection: api.IConnection = { host: connection.host };
  const moderatorJoin = await authorize_moderator_join(
    moderatorJoinConnection,
    {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        displayName: null,
        bio: null,
        avatarUrl: null,
        // Password not part of moderator join DTO, usually stored separately
      },
    },
  );
  typia.assert(moderatorJoin);
  // Simulate login with known password
  const moderatorLoginConnection: api.IConnection = { host: connection.host };
  const moderatorLogin = await authorize_moderator_login(
    moderatorLoginConnection,
    {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
      },
    },
  );
  typia.assert(moderatorLogin);
  const moderatorConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: moderatorLogin.token.access },
  };
  // Create user credentials for join
  const userPassword = RandomGenerator.alphaNumeric(16);
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userUsername = `user_${RandomGenerator.alphabets(8)}`;
  // Create and authorize user for unauthorized access attempt
  const userJoinConnection: api.IConnection = { host: connection.host };
  const userJoin = await authorize_user_join(userJoinConnection, {
    body: {
      email: userEmail,
      password: userPassword,
      username: userUsername,
      displayName: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  typia.assert(userJoin);
  // Simulate login with known password
  const userLoginConnection: api.IConnection = { host: connection.host };
  const userLogin = await authorize_user_login(userLoginConnection, {
    body: {
      email: userEmail,
      password: userPassword,
    },
  });
  typia.assert(userLogin);
  const userConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: userLogin.token.access },
  };
  // Create a valid user report to have a legitimate reportId
  const report = await api.functional.communityPlatform.user.reports.create(
    userConnection,
    {
      body: typia.random<ICommunityPlatformReport.ICreate>(),
    },
  );
  typia.assert(report);
  // Invalid UUID format test
  await TestValidator.httpError(
    "invalid UUID format reportId",
    400,
    async () => {
      await api.functional.communityPlatform.moderator.reports.reportedContents.index(
        moderatorConnection,
        {
          reportId: "not-a-uuid",
          body: {},
        },
      );
    },
  );
  // Non-existent valid UUID test
  const nonExistentUUID = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError("non-existent reportId", 404, async () => {
    await api.functional.communityPlatform.moderator.reports.reportedContents.index(
      moderatorConnection,
      {
        reportId: nonExistentUUID,
        body: {},
      },
    );
  });
  // Guest access unauthorized test (no auth header)
  const guestConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError("guest unauthorized access", 401, async () => {
    await api.functional.communityPlatform.moderator.reports.reportedContents.index(
      guestConnection,
      {
        reportId: report.id,
        body: {},
      },
    );
  });
  // Authenticated user access unauthorized test (not a moderator)
  await TestValidator.httpError("user unauthorized access", 403, async () => {
    await api.functional.communityPlatform.moderator.reports.reportedContents.index(
      userConnection,
      {
        reportId: report.id,
        body: {},
      },
    );
  });
}
