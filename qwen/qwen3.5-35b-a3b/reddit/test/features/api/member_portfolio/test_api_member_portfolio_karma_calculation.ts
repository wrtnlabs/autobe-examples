import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostFile";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { generate_random_reddit_community_member_posts_comments_votes_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_votes_create";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { generate_random_reddit_community_member_posts_votes_create } from "../../../generate/generate_random_reddit_community_member_posts_votes_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_comment_vote } from "../../../prepare/prepare_random_reddit_community_comment_vote";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_post_file } from "../../../prepare/prepare_random_reddit_community_post_file";
import { prepare_random_reddit_community_post_vote } from "../../../prepare/prepare_random_reddit_community_post_vote";

export async function test_api_member_portfolio_karma_calculation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup for portfolio lookup
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
    } satisfies IRedditCommunityAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Register Member A (portfolio owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000/",
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberA);
  // 3. Register Member B (voter)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000/",
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberB);
  // 4. Register Member C (voter)
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberC = await authorize_member_join(memberCConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000/",
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberC);
  // 5. Member A creates 2 posts
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const post1 = await api.functional.redditCommunity.member.posts.create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        reddit_community_community_id: communityId,
        text_content: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post1);
  const post2 = await api.functional.redditCommunity.member.posts.create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        reddit_community_community_id: communityId,
        text_content: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post2);
  // 6. Member B upvotes both of Member A's posts (+2 karma)
  await api.functional.redditCommunity.member.posts.votes.create(
    memberBConnection,
    {
      postId: post1.id,
      body: { vote_type: "upvote" } satisfies IRedditCommunityPostVote.ICreate,
    },
  );
  await api.functional.redditCommunity.member.posts.votes.create(
    memberBConnection,
    {
      postId: post2.id,
      body: { vote_type: "upvote" } satisfies IRedditCommunityPostVote.ICreate,
    },
  );
  // 7. Member C downvotes one of Member A's posts (-1 karma)
  await api.functional.redditCommunity.member.posts.votes.create(
    memberCConnection,
    {
      postId: post1.id,
      body: {
        vote_type: "downvote",
      } satisfies IRedditCommunityPostVote.ICreate,
    },
  );
  // 8. Member A creates 3 comments
  const comment1 =
    await api.functional.redditCommunity.member.posts.comments.create(
      memberAConnection,
      {
        postId: post1.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment1);
  const comment2 =
    await api.functional.redditCommunity.member.posts.comments.create(
      memberAConnection,
      {
        postId: post1.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment2);
  const comment3 =
    await api.functional.redditCommunity.member.posts.comments.create(
      memberAConnection,
      {
        postId: post2.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment3);
  // 9. Member B upvotes 2 of Member A's comments (+2 karma)
  await api.functional.redditCommunity.member.posts.comments.votes.create(
    memberBConnection,
    {
      postId: post1.id,
      commentId: comment1.id,
      body: {
        vote_type: "upvote",
      } satisfies IRedditCommunityCommentVote.ICreate,
    },
  );
  await api.functional.redditCommunity.member.posts.comments.votes.create(
    memberBConnection,
    {
      postId: post1.id,
      commentId: comment2.id,
      body: {
        vote_type: "upvote",
      } satisfies IRedditCommunityCommentVote.ICreate,
    },
  );
  // 10. Member C upvotes 1 of Member A's comments (+1 karma)
  await api.functional.redditCommunity.member.posts.comments.votes.create(
    memberCConnection,
    {
      postId: post2.id,
      commentId: comment3.id,
      body: {
        vote_type: "upvote",
      } satisfies IRedditCommunityCommentVote.ICreate,
    },
  );
  // 11. Call GET /redditCommunity/admin/members/{memberId}/portfolio for Member A
  const portfolio =
    await api.functional.redditCommunity.admin.members.portfolio.at(
      adminConnection,
      {
        memberId: memberA.id,
      },
    );
  typia.assert(portfolio);
  // 12. Validate karma score calculation
  TestValidator.equals("karma score", portfolio.karmaScore, 4);
  // 13. Validate all content is present
  TestValidator.equals("post count", portfolio.posts.length, 2);
  TestValidator.equals("comment count", portfolio.comments.length, 3);
}
