import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import type { IPageIRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunitySubscription";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunityUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserKarma";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import type { IRedditCommunityVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { generate_random_reddit_community_member_votes_create } from "../../../generate/generate_random_reddit_community_member_votes_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_vote } from "../../../prepare/prepare_random_reddit_community_vote";

export async function test_api_member_karma_positive_score(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member A (target member who will receive votes)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAResponse = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAResponse);
  // Get member A's profile to retrieve their username
  // Note: We use the access token to get authorization header set
  const memberAProfile = await api.functional.redditCommunity.members.at(
    connection,
    {
      memberId: "test_user", // Placeholder - we'll get actual username from response
    },
  );
  // 2. Create member B (voter who will cast votes)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBResponse = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberBResponse);
  // 3. List existing communities
  const communitiesPage =
    await api.functional.redditCommunity.communities.index(connection, {
      body: {
        limit: 1,
      },
    });
  typia.assert(communitiesPage);
  if (communitiesPage.data.length === 0) {
    throw new Error("No communities available for testing");
  }
  const community = communitiesPage.data[0];
  typia.assert(community);
  // 4. Member A creates first post
  const firstPost = await api.functional.redditCommunity.member.posts.create(
    memberAConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text" as const,
        body: RandomGenerator.content({ paragraphs: 1 }),
      },
    },
  );
  typia.assert(firstPost);
  // 5. Member A creates second post
  const secondPost = await api.functional.redditCommunity.member.posts.create(
    memberAConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text" as const,
        body: RandomGenerator.content({ paragraphs: 1 }),
      },
    },
  );
  typia.assert(secondPost);
  // 6. Member A creates a comment on first post
  const commentBody = prepare_random_reddit_community_comment();
  const comment =
    await api.functional.redditCommunity.member.posts.comments.create(
      memberAConnection,
      {
        postId: firstPost.id,
        body: commentBody,
      },
    );
  typia.assert(comment);
  // 7. Member B upvotes first post (+1 karma)
  const firstUpvote = await api.functional.redditCommunity.member.votes.create(
    memberBConnection,
    {
      body: {
        vote_type: "upvote" as const,
        target_post_id: firstPost.id,
      },
    },
  );
  typia.assert(firstUpvote);
  // 8. Member B upvotes second post (+1 karma)
  const secondUpvote = await api.functional.redditCommunity.member.votes.create(
    memberBConnection,
    {
      body: {
        vote_type: "upvote" as const,
        target_post_id: secondPost.id,
      },
    },
  );
  typia.assert(secondUpvote);
  // 9. Member B upvotes member A's comment (+1 karma)
  const commentUpvote =
    await api.functional.redditCommunity.member.votes.create(
      memberBConnection,
      {
        body: {
          vote_type: "upvote" as const,
          target_comment_id: comment.id,
        },
      },
    );
  typia.assert(commentUpvote);
  // 10. Member B downvotes one of member A's posts (-1 karma)
  const downvote = await api.functional.redditCommunity.member.votes.create(
    memberBConnection,
    {
      body: {
        vote_type: "downvote" as const,
        target_post_id: firstPost.id,
      },
    },
  );
  typia.assert(downvote);
  // 11. Query member A's karma score
  // We need to use memberAProfileDetail.id for karma lookup
  const memberAProfileDetail = await api.functional.redditCommunity.members.at(
    connection,
    {
      memberId: memberAProfile.username,
    },
  );
  typia.assert(memberAProfileDetail);
  // Get karma using member A's ID
  const memberKarma = await api.functional.redditCommunity.members.karma.at(
    connection,
    {
      memberId: memberAProfileDetail.username,
    },
  );
  typia.assert(memberKarma);
  // 12. Validate karma score
  // Expected: 3 upvotes - 1 downvote = 2
  const expectedKarma = 2;
  TestValidator.equals(
    "karma score calculation",
    memberKarma.current_score,
    expectedKarma,
  );
  // Verify karma is positive
  TestValidator.predicate("karma is positive", memberKarma.current_score > 0);
  // Verify member_id matches
  TestValidator.equals(
    "member ID matches",
    memberKarma.reddit_member_id,
    memberAProfileDetail.username,
  );
  // Verify timestamps exist
  TestValidator.predicate(
    "created_at exists",
    memberKarma.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    memberKarma.updated_at !== undefined,
  );
}