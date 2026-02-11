import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMaterializedViewSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMaterializedViewSchedule";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_materialized_view_schedule_forbidden_for_member(
  connection: api.IConnection,
): Promise<void> {
  // Create a member connection and authenticate as a regular member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IRedditCommunityMember.IJoin;
  await authorize_member_join(memberConnection, { body: memberCredentials });
  // Attempt to access a materialized view schedule as a regular member - should be forbidden
  const invalidScheduleId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "regular member should receive 403 Forbidden",
    403,
    async () => {
      await api.functional.redditCommunity.materialized_view_schedules.at(
        memberConnection,
        { scheduleId: invalidScheduleId },
      );
    },
  );
}
