import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_report_approval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new moderator and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  typia.assert(authorized);
  // Apply authorization token to connection headers
  moderatorConnection.headers ??= {};
  moderatorConnection.headers.Authorization = `Bearer ${authorized.token.access}`;
  // 2. Generate a random but non-existing reportId (UUID format)
  const nonExistingReportId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to approve a non-existing report
  await TestValidator.error(
    "approve non-existing report should fail with not found",
    async () => {
      await api.functional.communityPlatform.moderator.community.reports.approve.approveReport(
        moderatorConnection,
        { reportId: nonExistingReportId },
      );
    },
  );
}
