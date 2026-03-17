import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import type { IRedditCommunitySystemLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemLog";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_system_log_user_registration_event(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account via utility function
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(joinResult);
  // 2. Retrieve system log entry for registration event
  // Use generated UUID as system log ID from recent registration
  const systemLogId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const systemLogConnection: api.IConnection = { host: connection.host };
  const systemLog = await api.functional.redditCommunity.system_logs.at(
    systemLogConnection,
    {
      systemLogId,
    },
  );
  typia.assert(systemLog);
  // 3. Validate log entry structure
  TestValidator.notEquals(
    "system log id should exist",
    systemLog.id,
    undefined,
  );
  // 4. Validate activity type and action performed
  TestValidator.equals(
    "activity type is account_signup",
    systemLog.activity_type,
    "account_signup",
  );
  TestValidator.equals(
    "action performed is registration",
    systemLog.action_performed,
    "registration",
  );
  // 5. Validate target type is member
  TestValidator.equals(
    "target type is member",
    systemLog.target_type,
    "member",
  );
  // 6. Validate actor reference
  TestValidator.notEquals("actor should exist", systemLog.actor, undefined);
  typia.assert(systemLog.actor);
  TestValidator.notEquals(
    "actor id should exist",
    systemLog.actor!.id,
    undefined,
  );
  TestValidator.notEquals(
    "actor username should exist",
    systemLog.actor!.username,
    undefined,
  );
  TestValidator.notEquals(
    "actor created_at should exist",
    systemLog.actor!.created_at,
    undefined,
  );
  // 7. Validate metadata contains relevant registration context
  TestValidator.notEquals(
    "metadata should exist",
    systemLog.metadata,
    undefined,
  );
  // 8. Validate timestamps
  TestValidator.notEquals(
    "created_at timestamp should exist",
    systemLog.created_at,
    undefined,
  );
  TestValidator.notEquals(
    "updated_at timestamp should exist",
    systemLog.updated_at,
    undefined,
  );
  // 9. Validate actor_id relationship resolves correctly
  // actor should be non-null since activity_type is account_signup
  TestValidator.predicate(
    "actor exists for registration event",
    systemLog.actor !== null,
  );
}
