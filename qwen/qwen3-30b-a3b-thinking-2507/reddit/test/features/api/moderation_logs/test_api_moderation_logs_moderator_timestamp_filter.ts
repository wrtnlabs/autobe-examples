import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditModerationLog";
import type { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import type { IRedditModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditModerationLog";
import type { IRedditProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditProfile";
import type { IRedditReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_moderation_logs_moderator_timestamp_filter(
  connection: api.IConnection,
): Promise<void> {
  // Register new member account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
    } satisfies IRedditMember.IJoin,
  });
  // Filter moderation logs for recent activity (last 7 days)
  const response = await api.functional.reddit.member.moderation_logs.index(
    memberConnection,
    {
      body: {
        timestamp: "2026-02-16T12:34:03.499Z",
      } satisfies IRedditModerationLog.IRequest,
    },
  );
  typia.assert(response);
  // Verify response contains moderation logs
  TestValidator.predicate(
    "response contains moderation records",
    response.data.length > 0,
  );
  // Validate timestamp precision in results
  for (const log of response.data) {
    const logTimestamp = new Date(log.created_at);
    const sevenDaysAgo = new Date("2026-02-16T12:34:03.499Z");
    const currentTimestamp = new Date("2026-02-23T12:34:03.499Z");
    TestValidator.predicate(
      "log timestamp within 7-day window",
      logTimestamp >= sevenDaysAgo && logTimestamp <= currentTimestamp,
    );
  }
}
