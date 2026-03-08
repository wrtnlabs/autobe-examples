import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_comments_create } from "../../../generate/generate_random_reddit_platform_member_comments_create";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

export async function test_api_comment_vote_removal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate Member A (voter)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAResult = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: "12345678",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAResult);
  // 2. Create and authenticate Member B (comment author)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBResult = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: "12345678",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberBResult);
  // 3. Member B creates a community
  const memberBCommunityConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberBCommunityConnection, {
    body: {
      email: memberBResult.email,
      password: "12345678",
    },
  });
  const community =
    await generate_random_reddit_platform_member_communities_create(
      memberBCommunityConnection,
      {
        body: {
          name: typia.random<string & tags.MinLength<1> & tags.MaxLength<50>>(),
          description: "Test community for vote removal",
          icon_url: null,
        },
      },
    );
  typia.assert(community);
  // 4. Member B creates a post in the community
  const memberBPostConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberBPostConnection, {
    body: {
      email: memberBResult.email,
      password: "12345678",
    },
  });
  const post = await generate_random_reddit_platform_member_posts_create(
    memberBPostConnection,
    {
      body: {
        title: "Test post for vote removal",
        postType: "TEXT",
        redditPlatformCommunityId: community.id,
        content: "This is a test post content",
        url: null,
        imageUrl: null,
      },
    },
  );
  typia.assert(post);
  // 5. Member B creates a comment on the post
  const memberBCommentConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberBCommentConnection, {
    body: {
      email: memberBResult.email,
      password: "12345678",
    },
  });
  const comment = await generate_random_reddit_platform_member_comments_create(
    memberBCommentConnection,
    {
      body: {
        content: "This is a test comment",
        post_id: post.id,
        parent_id: null,
      },
    },
  );
  typia.assert(comment);
  const commentId: string & tags.Format<"uuid"> = comment.id;
  // Record initial comment vote score
  const initialVoteScore = comment.vote_score;
  TestValidator.equals("initial comment vote score", initialVoteScore, 0);
  // 6. Member A casts upvote on the comment
  const memberAVoteConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberAVoteConnection, {
    body: {
      email: memberAResult.email,
      password: "12345678",
    },
  });
  const upvoteResult =
    await api.functional.redditPlatform.member.comments.votes.vote(
      memberAVoteConnection,
      {
        commentId,
        body: {
          vote_type: "upvote",
        },
      },
    );
  typia.assert(upvoteResult);
  // 7. Verify upvote was applied
  const commentAfterUpvote = upvoteResult.comment;
  typia.assert(commentAfterUpvote);
  TestValidator.equals(
    "comment score after upvote",
    commentAfterUpvote.vote_score,
    1,
  );
  // 8. Member A removes their vote
  const voteRemovalResult =
    await api.functional.redditPlatform.member.comments.votes.vote(
      memberAVoteConnection,
      {
        commentId,
        body: {
          vote_type: undefined,
        },
      },
    );
  typia.assert(voteRemovalResult);
  // Verify vote was removed
  const commentAfterRemoval = voteRemovalResult.comment;
  typia.assert(commentAfterRemoval);
  TestValidator.equals(
    "comment score after vote removal",
    commentAfterRemoval.vote_score,
    0,
  );
  TestValidator.equals(
    "vote score back to initial",
    commentAfterRemoval.vote_score,
    initialVoteScore,
  );
  // 9. Member A casts downvote on the same comment
  const downvoteResult =
    await api.functional.redditPlatform.member.comments.votes.vote(
      memberAVoteConnection,
      {
        commentId,
        body: {
          vote_type: "downvote",
        },
      },
    );
  typia.assert(downvoteResult);
  // 10. Verify downvote score is -1
  const commentAfterDownvote = downvoteResult.comment;
  typia.assert(commentAfterDownvote);
  TestValidator.equals(
    "comment score after downvote",
    commentAfterDownvote.vote_score,
    -1,
  );
  // Verify vote type is downvote
  TestValidator.equals(
    "vote type is downvote",
    downvoteResult.voteType,
    "DOWNVOTE",
  );
  // 11. Verify Member A can remove vote again (cast another downvote -> upvote transition)
  const secondVoteRemoval =
    await api.functional.redditPlatform.member.comments.votes.vote(
      memberAVoteConnection,
      {
        commentId,
        body: {
          vote_type: "upvote",
        },
      },
    );
  typia.assert(secondVoteRemoval);
  const commentAfterChange = secondVoteRemoval.comment;
  typia.assert(commentAfterChange);
  TestValidator.equals(
    "comment score after changing vote",
    commentAfterChange.vote_score,
    1,
  );
  TestValidator.equals(
    "new vote type is upvote",
    secondVoteRemoval.voteType,
    "UPVOTE",
  );
}
