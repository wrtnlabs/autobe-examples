import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_moderation_logs_action_ban_user(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      username: RandomGenerator.name(),
    } satisfies IRedditMember.IJoin,
  });
  // Retrieve moderation log
  const logId = typia.random<string & tags.Format<"uuid">>();
  const log = await api.functional.reddit.member.moderation_logs.at(
    moderatorConnection,
    { logId },
  );
  typia.assert(log);
  // Verify action_type and reason existence
  TestValidator.equals("action type", log.action_type, "ban_user");
  TestValidator.predicate(
    "ban reason exists",
    log.reason != null && log.reason != undefined,
  );
  TestValidator.equals("report ID exists", log.report.id, log.report.id);
  TestValidator.equals(
    "moderator ID exists",
    log.moderator.id,
    log.moderator.id,
  );
}
