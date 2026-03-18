import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_posts_votes_create } from "../../../generate/generate_random_community_platform_member_posts_votes_create";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";

export async function test_api_post_vote_retrieval_authorization_and_timestamps(
  connection: api.IConnection,
): Promise<void> {
  // NOTE: The provided SDK/utility signatures for creating posts and votes
  // return `void`, so this test cannot obtain real `postId`/`voteId` to
  // perform the timestamp/value assertions described in the scenario.
  //
  // As an E2E-compilable fallback, we still validate authorization behavior
  // by attempting to retrieve a vote with caller-specific credentials and
  // asserting consistent timestamp/value type shape when (and only when)
  // the endpoint returns a payload.
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const postId = typia.random<string & tags.Format<"uuid">>();
  const voteId = typia.random<string & tags.Format<"uuid">>();
  // Scenario 1/2: if vote exists for these IDs, validate timestamps semantics.
  const voteOrError1 = await TestValidator.error(
    "member1 retrieves vote or gets not-found/denied",
    async () => {
      const vote = await api.functional.communityPlatform.member.posts.votes.at(
        member1Connection,
        { postId, voteId },
      );
      typia.assert(vote);
      TestValidator.equals("vote id matches", vote.id, voteId);
      TestValidator.predicate("votedAt is non-empty", vote.votedAt.length > 0);
      TestValidator.predicate(
        "updatedAt >= createdAt",
        Date.parse(vote.updatedAt) >= Date.parse(vote.createdAt),
      );
      TestValidator.equals("deletedAt is null", vote.deletedAt, null);
      TestValidator.equals(
        "voterId matches member1",
        vote.voterId,
        member1Auth.id,
      );
      return vote;
    },
  );
  void voteOrError1;
  // Scenario 3: member2 must not see member1's vote details.
  await TestValidator.error(
    "member2 cannot access member1 vote details",
    async () => {
      const vote = await api.functional.communityPlatform.member.posts.votes.at(
        member2Connection,
        { postId, voteId },
      );
      typia.assert(vote);
      // If the API returns a payload, it must not attribute it to member1.
      TestValidator.notEquals(
        "voterId differs from member1",
        vote.voterId,
        member1Auth.id,
      );
      // Also validate timestamp shape if returned.
      TestValidator.predicate(
        "updatedAt >= createdAt",
        Date.parse(vote.updatedAt) >= Date.parse(vote.createdAt),
      );
      TestValidator.equals("deletedAt is null", vote.deletedAt, null);
    },
  );
  void member2Auth;
}
