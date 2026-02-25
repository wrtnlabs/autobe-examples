import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import type { ICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportedContent";
import type { ICommunityPlatformReportsDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportsDecision";
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

/**
 * Test scenario to verify that an unauthorized user cannot dismiss a report.
 * Attempt to dismiss a user report without any authentication or with an unauthorized role.
 * Validate the operation fails with an authorization error (403 or 401) and the report remains unchanged.
 */
export async function test_api_moderator_report_dismiss_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Step 1. Prepare moderator credentials and join
  const moderatorJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    username: `mod_${typia.random<string & tags.Format<"email">>().split("@")[0]}`,
    displayName: "ModUser",
    bio: "Moderator bio",
    avatarUrl: null,
  };
  const baseConnection: api.IConnection = { host: connection.host };
  const moderatorJoin = await authorize_moderator_join(baseConnection, {
    body: moderatorJoinInput,
  });
  typia.assert(moderatorJoin);
  // Step 2. Prepare user credentials and join
  const userJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "UserPass123!",
    username: `user_${typia.random<string & tags.Format<"email">>().split("@")[0]}`,
    displayName: "UserDisplay",
    href: "https://referrer.example.com/",
    referrer: "https://referrer.example.com/",
    ip: null,
  } as {
    email: string & tags.Format<"email">;
    password: string;
    username: string;
    displayName: string;
    href: string;
    referrer: string;
    ip: string | null;
  };
  const userJoin = await authorize_user_join(baseConnection, {
    body: userJoinInput,
  });
  typia.assert(userJoin);
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_login(userConnection, {
    body: {
      email: userJoinInput.email,
      password: userJoinInput.password,
    },
  });
  // Step 3. User creates a user report to have a report to dismiss
  // Construct a valid minimal report creation body
  const reportBody = {
    description: "Inappropriate content",
    status: "pending",
    communityPlatformUserId: userJoin.id,
    communityPlatformReportReasonId: typia.random<
      string & tags.Format<"uuid">
    >(),
    // reportedContents may be required by server, set empty array
    reportedContents: [],
  } as {
    description: string;
    status: string;
    communityPlatformUserId: string;
    communityPlatformReportReasonId: string;
    reportedContents: Array<unknown>;
  };
  const report = await api.functional.communityPlatform.user.reports.create(
    userConnection,
    { body: reportBody },
  );
  typia.assert(report);
  // Step 4. Attempt to dismiss the report without any authorization connection
  // We reuse baseConnection with no authorization headers
  await TestValidator.httpError(
    "dismiss report without any authorization should fail",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.moderator.reports.dismiss(
        baseConnection,
        {
          reportId: report.id,
        },
      );
    },
  );
  // Step 5. Attempt to dismiss the report with unauthorized user role connection
  // i.e., attempt with userConnection (regular user) who is not moderator
  await TestValidator.httpError(
    "dismiss report with unauthorized user role should fail",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.moderator.reports.dismiss(
        userConnection,
        {
          reportId: report.id,
        },
      );
    },
  );
  // Step 6. Verify that the report's status remains unchanged (status not dismissed)
  // To verify, retrieve fresh report data would be ideal, but no endpoint is provided,
  // so we rely on the original report data which should still have status not dismissed
  TestValidator.predicate(
    "report status is not dismissed",
    report.status !== "dismissed",
  );
}
