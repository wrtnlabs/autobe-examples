import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommentVote";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_posts_comments_create } from "../../../generate/generate_random_community_member_posts_comments_create";
import { generate_random_community_member_posts_comments_votes_create } from "../../../generate/generate_random_community_member_posts_comments_votes_create";
import { prepare_random_community_comment } from "../../../prepare/prepare_random_community_comment";
import { prepare_random_community_comment_vote } from "../../../prepare/prepare_random_community_comment_vote";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

export async function test_api_comment_vote_direction_change_idempotent_same_direction(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member B (comment author & community owner)
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // 2. Member B creates a community
  const community = await generate_random_community_member_communities_create(
    memberBConnection,
    {},
  );
  typia.assert(community);
  // 3. Member B subscribes to the community
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      memberBConnection,
      { communityId: community.id },
    );
  typia.assert(subscription);
  // 4. Member B creates a text post in the community
  const post = await api.functional.community.member.communities.posts.create(
    memberBConnection,
    {
      communityId: community.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        type: "text",
        body: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Member B creates a comment on the post
  const comment = await generate_random_community_member_posts_comments_create(
    memberBConnection,
    {
      params: { postId: post.id },
    },
  );
  typia.assert(comment);
  // 6. Register member A (voter)
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  // 7. Member A casts an initial upvote on member B's comment
  const initialVote =
    await generate_random_community_member_posts_comments_votes_create(
      memberAConnection,
      {
        body: { voteType: "up" },
        params: {
          postId: post.id,
          commentId: comment.id,
        },
      },
    );
  typia.assert(initialVote);
  // Record the original vote fields
  const originalId = initialVote.id;
  const originalVoteType = initialVote.vote_type;
  const originalCreatedAt = initialVote.created_at;
  const originalUpdatedAt = initialVote.updated_at;
  // 8. Member A calls PUT with the same direction (up) - should be idempotent
  const updatedVote =
    await api.functional.community.member.posts.comments.votes.update(
      memberAConnection,
      {
        postId: post.id,
        commentId: comment.id,
        voteId: initialVote.id,
        body: { voteType: "up" } satisfies ICommunityCommentVote.IUpdate,
      },
    );
  typia.assert(updatedVote);
  // Validations: idempotent - record should be unchanged
  TestValidator.equals("vote id unchanged", updatedVote.id, originalId);
  TestValidator.equals(
    "vote_type unchanged",
    updatedVote.vote_type,
    originalVoteType,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedVote.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "updated_at unchanged",
    updatedVote.updated_at,
    originalUpdatedAt,
  );
  TestValidator.equals("vote_type is up", updatedVote.vote_type, "up");
}
