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

export async function test_api_moderation_logs_action_type_retrieval(
  connection: api.IConnection,
) {
  // Create a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
    } satisfies IRedditMember.IJoin,
  });
  // Retrieve moderation logs filtered by action type 'delete_post' and resolution status 'approved'
  const logs = await api.functional.reddit.member.moderation_logs.index(
    memberConnection,
    {
      body: {
        actionType: "delete_post",
        resolutionStatus: "approved",
      } satisfies IRedditModerationLog.IRequest,
    },
  );
  typia.assert(logs);
  // Verify logs array contains data
  TestValidator.predicate("logs array contains data", logs.data.length > 0);
  // Validate moderation logs with expected criteria
  for (const log of logs.data) {
    TestValidator.equals(
      "action_type should be delete_post",
      log.action_type,
      "delete_post",
    );
    TestValidator.equals("result should be approved", log.result, "approved");
  }
}
