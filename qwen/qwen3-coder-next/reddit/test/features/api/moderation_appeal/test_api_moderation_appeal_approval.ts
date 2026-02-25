import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationAppeal";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderation_appeal_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login as member (user who will receive ban)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoinData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.alphaNumeric(8),
    displayName: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IRedditCloneMember.IJoin;
  const memberAuth = await api.functional.redditClone.auth.member.join(
    memberConnection,
    { body: memberJoinData },
  );
  typia.assert(memberAuth);
  // Create new connection with token
  const userConnection: api.IConnection = { host: connection.host };
  await api.functional.redditClone.auth.member.login(userConnection, {
    body: {
      email: memberJoinData.email,
      password: memberJoinData.password,
    } satisfies IRedditCloneMember.ILogin,
  });
  // 2. Register and login as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorJoinData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.alphaNumeric(8),
    displayName: null,
  } satisfies IRedditCloneModerator.IJoin;
  const moderatorAuth = await api.functional.redditClone.auth.moderator.join(
    moderatorConnection,
    { body: moderatorJoinData },
  );
  typia.assert(moderatorAuth);
  // Create new connection with moderator token
  const modConnection: api.IConnection = { host: connection.host };
  await api.functional.redditClone.auth.moderator.login(modConnection, {
    body: {
      email: moderatorJoinData.email,
      password: moderatorJoinData.password,
    } satisfies IRedditCloneModerator.ILogin,
  });
  // 3. Create a community where moderation actions will occur
  const communityName = RandomGenerator.alphaNumeric(10);
  // 4. Submit a report for the user (simulating moderation action)
  const reportResponse = await api.functional.redditClone.appeals.processAppeal(
    modConnection,
    {
      appealId: "test-appeal-id",
      body: {
        action: "approve" as const,
        decisionReason: "Appeal approved after review",
      } satisfies IRedditCloneModerationAppeal.IUpdate,
    },
  );
  typia.assert(reportResponse);
  // 5. Verify appeal was approved by checking status
  TestValidator.equals(
    "appeal status should be approved",
    reportResponse.status,
    "approved",
  );
  TestValidator.equals(
    "decision reason preserved",
    reportResponse.decision_reason,
    "Appeal approved after review",
  );
}
