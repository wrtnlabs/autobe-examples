import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostEngagementStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostEngagementStat";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_stats_karma_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account (karma starts at 0)
  const joinConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(),
      href: "http://test.local/signup",
      referrer: "http://test.local",
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create authenticated connection for member
  const memberAuthConnection: api.IConnection = { host: connection.host };
  memberAuthConnection.headers = {
    Authorization: member.token.access,
  };
  // 3. Call profile stats multiple times - verify consistency
  const stats1 =
    await api.functional.redditPlatform.member.profile.stats(
      memberAuthConnection,
    );
  typia.assert(stats1);
  const stats2 =
    await api.functional.redditPlatform.member.profile.stats(
      memberAuthConnection,
    );
  typia.assert(stats2);
  const stats3 =
    await api.functional.redditPlatform.member.profile.stats(
      memberAuthConnection,
    );
  typia.assert(stats3);
  // 4. Verify karma_score is 0 for new member
  TestValidator.equals("karma score initial", stats1.karma_score, 0);
  // 5. Verify consistency across multiple calls
  TestValidator.equals(
    "karma consistent call 1 & 2",
    stats1.karma_score,
    stats2.karma_score,
  );
  TestValidator.equals(
    "karma consistent call 2 & 3",
    stats2.karma_score,
    stats3.karma_score,
  );
  // 6. Verify response structure
  TestValidator.equals("member id consistent", stats1.id, stats2.id);
  TestValidator.equals("member id consistent", stats2.id, stats3.id);
  // 7. Verify karma is integer type (not float)
  const karmaFloatCheck = stats1.karma_score % 1 === 0;
  TestValidator.predicate("karma is integer type", karmaFloatCheck);
}
