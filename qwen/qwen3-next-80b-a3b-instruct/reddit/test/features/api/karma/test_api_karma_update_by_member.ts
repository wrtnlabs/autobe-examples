import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsKarmaScore";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_karma_update_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Create connection for member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityBbsMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<
          string & tags.MinLength<8> & tags.MaxLength<128>
        >(),
      } satisfies ICommunityBbsMember.IJoin,
    },
  );
  typia.assert(member);
  // Validate initial karma score is non-negative
  TestValidator.predicate(
    "member has non-negative karma score",
    member.karma_score >= 0,
  );
  // Test 1: Successful karma update with new score within valid range
  const newScore = RandomGenerator.pick([10, 50, 100, 200, 500]) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> &
    tags.Maximum<1000>;
  await api.functional.communityBbs.member.users.karma.update(
    memberConnection,
    {
      body: {
        pendingPenalties: null,
        currentScore: newScore,
        decayStatus: "active", // Assuming active state
        lastUpdated: new Date().toISOString(),
      } satisfies ICommunityBbsKarmaScore,
    },
  );
  // Test 2: Set karma score to zero (minimum allowed)
  await api.functional.communityBbs.member.users.karma.update(
    memberConnection,
    {
      body: {
        pendingPenalties: null,
        currentScore: 0,
        decayStatus: "active",
        lastUpdated: new Date().toISOString(),
      } satisfies ICommunityBbsKarmaScore,
    },
  );
  // Test 3: Karma update with invalid negative score should fail
  await TestValidator.error("karma cannot be negative", async () => {
    await api.functional.communityBbs.member.users.karma.update(
      memberConnection,
      {
        body: {
          pendingPenalties: null,
          currentScore: -5,
          decayStatus: "active",
          lastUpdated: new Date().toISOString(),
        } satisfies ICommunityBbsKarmaScore,
      },
    );
  });
  // Test 4: Karma update with very high score should succeed
  const highScore = 1000;
  await api.functional.communityBbs.member.users.karma.update(
    memberConnection,
    {
      body: {
        pendingPenalties: null,
        currentScore: highScore,
        decayStatus: "active",
        lastUpdated: new Date().toISOString(),
      } satisfies ICommunityBbsKarmaScore,
    },
  );
  // Test 5: Karma update with score at maximum limit should succeed
  const maxScore = 1000; // As per reasonable limit
  await api.functional.communityBbs.member.users.karma.update(
    memberConnection,
    {
      body: {
        pendingPenalties: null,
        currentScore: maxScore,
        decayStatus: "active",
        lastUpdated: new Date().toISOString(),
      } satisfies ICommunityBbsKarmaScore,
    },
  );
}
