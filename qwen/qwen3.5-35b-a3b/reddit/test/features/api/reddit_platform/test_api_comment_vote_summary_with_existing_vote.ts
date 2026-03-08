import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
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
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

export async function test_api_comment_vote_summary_with_existing_vote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate Member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberA);
  // 2. Member A creates a post
  const memberAPost = await api.functional.redditPlatform.member.posts.create(
    memberAConnection,
    {
      body: {
        title: typia.random<string & tags.MinLength<1> & tags.MaxLength<300>>(),
        postType: "TEXT",
        redditPlatformCommunityId: typia.random<string & tags.Format<"uuid">>(),
        content: "Test post content",
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(memberAPost);
  // 3. Member A creates a comment on their post
  const memberAComment =
    await api.functional.redditPlatform.member.comments.create(
      memberAConnection,
      {
        body: {
          content: typia.random<string & tags.MinLength<1>>(),
          post_id: memberAPost.id,
        } satisfies IRedditPlatformComment.ICreate,
      },
    );
  typia.assert(memberAComment);
  // 4. Member A casts an upvote on their own comment
  const memberAVoteOnTheirComment =
    await api.functional.redditPlatform.member.comments.votes.vote(
      memberAConnection,
      {
        commentId: memberAComment.id,
        body: {
          vote_type: "upvote",
        } satisfies IRedditPlatformComment.IVoteRequest,
      },
    );
  typia.assert(memberAVoteOnTheirComment);
  // 5. Create and authenticate Member B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberB);
  // 6. Member B creates a post
  const memberBPost = await api.functional.redditPlatform.member.posts.create(
    memberBConnection,
    {
      body: {
        title: typia.random<string & tags.MinLength<1> & tags.MaxLength<300>>(),
        postType: "TEXT",
        redditPlatformCommunityId: typia.random<string & tags.Format<"uuid">>(),
        content: "Test post content from Member B",
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(memberBPost);
  // 7. Member B creates a comment on their post
  const memberBComment =
    await api.functional.redditPlatform.member.comments.create(
      memberBConnection,
      {
        body: {
          content: typia.random<string & tags.MinLength<1>>(),
          post_id: memberBPost.id,
        } satisfies IRedditPlatformComment.ICreate,
      },
    );
  typia.assert(memberBComment);
  // 8. Member B casts an upvote on their own comment
  const memberBVoteOnTheirComment =
    await api.functional.redditPlatform.member.comments.votes.vote(
      memberBConnection,
      {
        commentId: memberBComment.id,
        body: {
          vote_type: "upvote",
        } satisfies IRedditPlatformComment.IVoteRequest,
      },
    );
  typia.assert(memberBVoteOnTheirComment);
  // 9. Member A casts a downvote on Member B's comment
  const memberAVoteOnMemberBComment =
    await api.functional.redditPlatform.member.comments.votes.vote(
      memberAConnection,
      {
        commentId: memberBComment.id,
        body: {
          vote_type: "downvote",
        } satisfies IRedditPlatformComment.IVoteRequest,
      },
    );
  typia.assert(memberAVoteOnMemberBComment);
  // 10. Member A views vote summary for their own comment
  const memberACommentVotes =
    await api.functional.redditPlatform.member.comments.votes.at(
      memberAConnection,
      {
        commentId: memberAComment.id,
      },
    );
  typia.assert(memberACommentVotes);
  TestValidator.equals(
    "Member A's comment: upvote count",
    memberACommentVotes.upvoteCount,
    1,
  );
  TestValidator.equals(
    "Member A's comment: downvote count",
    memberACommentVotes.downvoteCount,
    0,
  );
  TestValidator.equals(
    "Member A's comment: score",
    memberACommentVotes.score,
    1,
  );
  TestValidator.equals(
    "Member A's comment: total votes",
    memberACommentVotes.totalVotes,
    1,
  );
  TestValidator.equals(
    "Member A's comment: userVote",
    memberACommentVotes.userVote,
    "upvote",
  );
  // 11. Member A views vote summary for Member B's comment
  const memberBCommentVotes =
    await api.functional.redditPlatform.member.comments.votes.at(
      memberAConnection,
      {
        commentId: memberBComment.id,
      },
    );
  typia.assert(memberBCommentVotes);
  TestValidator.equals(
    "Member B's comment: upvote count",
    memberBCommentVotes.upvoteCount,
    1,
  );
  TestValidator.equals(
    "Member B's comment: downvote count",
    memberBCommentVotes.downvoteCount,
    1,
  );
  TestValidator.equals(
    "Member B's comment: score",
    memberBCommentVotes.score,
    0,
  );
  TestValidator.equals(
    "Member B's comment: total votes",
    memberBCommentVotes.totalVotes,
    2,
  );
  TestValidator.equals(
    "Member B's comment: userVote",
    memberBCommentVotes.userVote,
    "downvote",
  );
}
