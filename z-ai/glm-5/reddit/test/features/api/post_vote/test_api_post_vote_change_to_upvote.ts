import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
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
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_posts_create } from "../../../generate/generate_random_community_platform_member_communities_posts_create";
import { generate_random_community_platform_member_posts_vote_create } from "../../../generate/generate_random_community_platform_member_posts_vote_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";

export async function test_api_post_vote_change_to_upvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create author connection and authenticate
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {});
  // 2. Create community (author becomes owner automatically)
  const community =
    await generate_random_community_platform_member_communities_create(
      authorConnection,
      {},
    );
  typia.assert(community);
  // 3. Create a text post in the community
  const post =
    await generate_random_community_platform_member_communities_posts_create(
      authorConnection,
      {
        params: { communityId: community.id },
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          postType: "text",
          content: RandomGenerator.content({ paragraphs: 2 }),
        },
      },
    );
  typia.assert(post);
  // Store initial author karma
  const initialAuthorKarma = author.karma;
  // 4. Create voter connection and authenticate (separate user)
  const voterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(voterConnection, {});
  // 5. Cast initial downvote on the post
  const initialVote =
    await generate_random_community_platform_member_posts_vote_create(
      voterConnection,
      {
        params: { postId: post.id },
        body: {
          targetType: "post",
          targetId: post.id,
          voteType: "downvote",
        },
      },
    );
  typia.assert(initialVote);
  // Verify initial vote is a downvote
  TestValidator.equals(
    "initial vote is downvote",
    initialVote.voteType,
    "downvote",
  );
  TestValidator.equals(
    "vote targets correct post",
    initialVote.targetId,
    post.id,
  );
  TestValidator.equals(
    "vote targets post type",
    initialVote.targetType,
    "post",
  );
  // 6. Change vote from downvote to upvote using PUT endpoint (target endpoint)
  const updatedVote =
    await api.functional.communityPlatform.member.posts.vote.update(
      voterConnection,
      {
        postId: post.id,
        body: {
          vote_type: "upvote",
          target_type: "post",
        } satisfies ICommunityPlatformPostVote.IUpdate,
      },
    );
  typia.assert(updatedVote);
  // 7. Verify the vote was successfully changed to upvote
  TestValidator.equals(
    "vote type changed to upvote",
    updatedVote.voteType,
    "upvote",
  );
  // 8. Verify same vote record was updated (not a new vote created)
  TestValidator.equals(
    "same vote ID maintained",
    updatedVote.id,
    initialVote.id,
  );
  // 9. Verify the target remains the same
  TestValidator.equals(
    "target post ID unchanged",
    updatedVote.targetId,
    post.id,
  );
  TestValidator.equals("target type unchanged", updatedVote.targetType, "post");
  // 10. Verify the voter is the same
  TestValidator.equals(
    "same voter",
    updatedVote.member.id,
    initialVote.member.id,
  );
  // 11. Verify updated_at timestamp changed (modification occurred)
  TestValidator.notEquals(
    "updated_at timestamp changed",
    updatedVote.updatedAt,
    initialVote.updatedAt,
  );
}
