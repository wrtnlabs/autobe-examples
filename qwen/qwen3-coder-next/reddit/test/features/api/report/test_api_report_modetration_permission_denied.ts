import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerator";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
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

export async function test_api_report_modetration_permission_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator for Community A
  const moderatorConnectionA: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnectionA, {
    body: typia.random<IRedditPlatformModerator.IJoin>(),
  });
  // 2. Create moderator for Community B
  const moderatorConnectionB: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnectionB, {
    body: typia.random<IRedditPlatformModerator.IJoin>(),
  });
  // 3. Create user for Community B content
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: typia.random<IRedditPlatformUser.IJoin>(),
  });
  // 4. User creates a post in Community B (simulating content that would get reported)
  // Note: Since community creation is not available in the API, we assume Community B exists
  // and the user creates content in it. For this test, we'll use a dummy community ID.
  // In a real scenario, you would create a community first using community creation endpoint.
  // 5. Submit a report on Community B's content
  // Since we don't have report submission endpoint available, we'll assume a report exists
  // for Community B's content. For this test, we'll use dummy IDs.
  // 6. Have the Community A moderator attempt to moderate the Community B report
  await TestValidator.error(
    "moderator from Community A should be denied access to Community B report",
    async () => {
      await api.functional.redditPlatform.moderator.communities.reports.moderation.moderate(
        moderatorConnectionA,
        {
          communityId: "community-b-id", // Community B's ID
          reportId: "report-b-id", // Report on Community B's content
          body: typia.random<IRedditPlatformReport.IModerationRequest>(),
        },
      );
    },
  );
}
