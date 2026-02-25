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

export async function test_api_moderator_reports_at_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Test that unauthorized users cannot retrieve report details
  // 1. Create a moderator to get a valid reportId
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuthorized = await authorize_moderator_join(
    moderatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.name(),
        displayName: null,
        bio: null,
        avatarUrl: null,
      },
    },
  );
  typia.assert(moderatorAuthorized);
  moderatorConnection.headers = {
    Authorization: moderatorAuthorized.token.access,
  };
  // For testing unauthorized access, use a fake reportId (random UUID)
  const fakeReportId = typia.random<string & tags.Format<"uuid">>();
  // 2. Attempt with NO authentication
  await TestValidator.httpError(
    "unauthorized access without token returns 403",
    403,
    async () => {
      // Directly call the reports.at with base connection without auth
      await api.functional.communityPlatform.moderator.reports.at(connection, {
        reportId: fakeReportId,
      });
    },
  );
  // 3. Attempt with INVALID authentication token
  const invalidAuthConnection: api.IConnection = { host: connection.host };
  invalidAuthConnection.headers = {
    Authorization: "Bearer invalid.token.here",
  };
  await TestValidator.httpError(
    "unauthorized access with invalid token returns 403",
    403,
    async () => {
      await api.functional.communityPlatform.moderator.reports.at(
        invalidAuthConnection,
        {
          reportId: fakeReportId,
        },
      );
    },
  );
  // 4. Attempt with valid moderator authentication but to simulate insufficient role,
  // we do not alter roles but just test that a genuine valid token works
  // This is basically a positive test, but included here for completeness
  // We may attempt to fetch a known report if exists; here we just test error on a random ID
  await TestValidator.httpError(
    "access with valid moderator token but non-existent report returns 403 or 404",
    [403, 404],
    async () => {
      await api.functional.communityPlatform.moderator.reports.at(
        moderatorConnection,
        {
          reportId: fakeReportId,
        },
      );
    },
  );
}
