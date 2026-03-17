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

export async function test_api_comment_vote_direction_change_upvote_to_downvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member B (comment author & community owner)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
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
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Member B creates a top-level comment on the post
  const comment = await generate_random_community_member_posts_comments_create(
    memberBConnection,
    {
      params: { postId: post.id },
    },
  );
  typia.assert(comment);
  // 6. Register member A (voter)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 7. Member A casts an upvote on member B's comment
  const upvote =
    await generate_random_community_member_posts_comments_votes_create(
      memberAConnection,
      {
        body: { voteType: "up" },
        params: { postId: post.id, commentId: comment.id },
      },
    );
  typia.assert(upvote);
  // Validate the initial upvote
  TestValidator.equals("initial vote type is up", upvote.vote_type, "up");
  TestValidator.equals(
    "vote member matches member A",
    upvote.member.id,
    memberA.id,
  );
  TestValidator.equals(
    "vote comment matches comment",
    upvote.comment.id,
    comment.id,
  );
  // Comment vote score after upvote should be +1
  TestValidator.equals(
    "comment vote score after upvote",
    upvote.comment.vote_score,
    1,
  );
  // 8. Member A changes vote direction from upvote to downvote
  const updatedVote =
    await api.functional.community.member.posts.comments.votes.update(
      memberAConnection,
      {
        postId: post.id,
        commentId: comment.id,
        voteId: upvote.id,
        body: { voteType: "down" } satisfies ICommunityCommentVote.IUpdate,
      },
    );
  typia.assert(updatedVote);
  // Validations
  // Vote direction must now be 'down'
  TestValidator.equals(
    "vote type changed to down",
    updatedVote.vote_type,
    "down",
  );
  // Vote ID must be same as original
  TestValidator.equals("vote id unchanged", updatedVote.id, upvote.id);
  // Member reference must match member A
  TestValidator.equals("voter is member A", updatedVote.member.id, memberA.id);
  // Comment reference must match the original comment
  TestValidator.equals(
    "comment id unchanged",
    updatedVote.comment.id,
    comment.id,
  );
  // updated_at must be >= created_at (the record was modified)
  TestValidator.predicate(
    "updated_at is after or equal to created_at",
    new Date(updatedVote.updated_at) >= new Date(updatedVote.created_at),
  );
  // Comment vote score should now be -1 (downvote)
  TestValidator.equals(
    "comment vote score after direction change",
    updatedVote.comment.vote_score,
    -1,
  );
}
