import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";

/**
 * Test that the member's karma score is correctly calculated and reflected in their profile.
 *
 * This test validates:
 * 1. New members start with karma score of 0
 * 2. The karma field is properly typed and validated in profile responses
 * 3. Profile endpoint returns complete member information including karma
 */
export async function test_api_member_profile_karma_score_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first member account (member A)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA: IRedditCloneMember.IAuthorized = await authorize_member_join(
    memberAConnection,
    {
      body: {
        username: RandomGenerator.alphabets(8),
      },
    },
  );
  typia.assert(memberA);
  // 2. Register second member account (member B)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB: IRedditCloneMember.IAuthorized = await authorize_member_join(
    memberBConnection,
    {
      body: {
        username: RandomGenerator.alphabets(8),
      },
    },
  );
  typia.assert(memberB);
  // 3. Create a community (owned by member A)
  const community: IRedditCloneCommunity =
    await generate_random_reddit_clone_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 4. Member A retrieves their profile
  const profileA: IRedditCloneMember =
    await api.functional.redditClone.member.me.at(memberAConnection);
  typia.assert(profileA);
  // 5. Member B retrieves their profile
  const profileB: IRedditCloneMember =
    await api.functional.redditClone.member.me.at(memberBConnection);
  typia.assert(profileB);
  // 6. Verify initial karma is 0 for both members
  TestValidator.equals("member A initial karma", profileA.karma, 0);
  TestValidator.equals("member B initial karma", profileB.karma, 0);
  // 7. Verify karma is a valid int32 number
  TestValidator.predicate(
    "member A karma is valid int32",
    Number.isInteger(profileA.karma) &&
      profileA.karma >= -2147483648 &&
      profileA.karma <= 2147483647,
  );
  TestValidator.predicate(
    "member B karma is valid int32",
    Number.isInteger(profileB.karma) &&
      profileB.karma >= -2147483648 &&
      profileB.karma <= 2147483647,
  );
  // 8. Verify profile contains all expected fields
  TestValidator.equals(
    "member A username matches",
    profileA.username,
    memberA.username,
  );
  TestValidator.equals(
    "member B username matches",
    profileB.username,
    memberB.username,
  );
  TestValidator.predicate("member A has email", profileA.email.length > 0);
  TestValidator.predicate("member B has email", profileB.email.length > 0);
  TestValidator.predicate(
    "member A has display name",
    profileA.display_name.length > 0,
  );
  TestValidator.predicate(
    "member B has display name",
    profileB.display_name.length > 0,
  );
}
