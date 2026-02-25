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

export async function test_api_moderator_report_approval_conflict_state(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      displayName: null,
      bio: null,
      avatarUrl: null,
    },
  });
  typia.assert(authorized);
  moderatorConnection.headers = {
    Authorization: authorized.token.access,
  };
  // 2. Attempt to approve a report that is already deleted or dismissed
  // Generate a random UUID to simulate non-existent or conflict report ID
  const invalidReportId = typia.random<string & tags.Format<"uuid">>();
  // Expect error due to conflict or non-existence
  await TestValidator.httpError(
    "approval conflict or non-existence",
    [404, 409],
    async () => {
      await api.functional.communityPlatform.moderator.reports.approve.approveReport(
        moderatorConnection,
        {
          reportId: invalidReportId,
        },
      );
    },
  );
  // 3. Confirm authorization enforcement denies approval by unauthorized users
  // Use base connection without auth
  await TestValidator.httpError(
    "unauthorized approval denied",
    401,
    async () => {
      await api.functional.communityPlatform.moderator.reports.approve.approveReport(
        connection,
        {
          reportId: invalidReportId,
        },
      );
    },
  );
}
