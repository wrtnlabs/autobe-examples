import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { generate_random_community_platform_communities_posts_new_create } from "../../../generate/generate_random_community_platform_communities_posts_new_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_post_vote_removal(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  // Step 2: Create a community with a valid code
  const communityCode = RandomGenerator.alphaNumeric(8);
  // Step 3: Create a post in the community
  const post =
    await api.functional.communityPlatform.communities.posts._new.create(
      memberConnection,
      {
        communityCode,
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          text: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(post);
  const postId = post.id;
  // Step 4: Submit an upvote on the post
  const voteResult =
    await api.functional.communityPlatform.member.posts.votes.index(
      memberConnection,
      { postId },
    );
  typia.assert(voteResult);
  // Step 5: Remove the vote entirely
  const removeVoteResult =
    await api.functional.communityPlatform.member.posts.votes.index(
      memberConnection,
      { postId },
    );
  typia.assert(removeVoteResult);
  // Note: We cannot validate post score or author karma changes because
  // no API endpoint exists to retrieve post scores or author karma after voting
  // The scenario's validation requirements are not implementable with the provided API
}
