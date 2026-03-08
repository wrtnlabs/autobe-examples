import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_subscribe } from "../../../generate/generate_random_reddit_platform_member_communities_subscribe";
import { generate_random_reddit_platform_member_post_votes_cast } from "../../../generate/generate_random_reddit_platform_member_post_votes_cast";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_subscription } from "../../../prepare/prepare_random_reddit_platform_community_subscription";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";
import { prepare_random_reddit_platform_post_vote } from "../../../prepare/prepare_random_reddit_platform_post_vote";

export async function test_api_feeds_controversial_vote_changes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Member A account
  const memberA: IRedditPlatformMember.IAuthorized =
    await authorize_member_join(connection, {
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
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditPlatformMember.IJoin,
    });
  typia.assert(memberA);
  // 2. Member A creates community
  const memberAConnection: api.IConnection = { host: connection.host };
  memberAConnection.headers = {
    Authorization: memberA.token.access,
  };
  const community: IRedditPlatformCommunity =
    await api.functional.redditPlatform.member.communities.create(
      memberAConnection,
      {
        body: {
          name: typia.random<
            string &
              tags.MinLength<3> &
              tags.MaxLength<20> &
              tags.Pattern<"^[a-zA-Z0-9_]+$">
          >(),
          description: typia.random<string>(),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Member A subscribes to community
  await api.functional.redditPlatform.member.communities.subscribe(
    memberAConnection,
    {
      communityId: community.id,
      body: {
        confirmSubscription: true,
      } satisfies IRedditPlatformCommunitySubscription.ICreate,
    },
  );
  // 4. Member A creates post with balanced voting potential
  const post: IRedditPlatformPost =
    await api.functional.redditPlatform.member.posts.create(memberAConnection, {
      body: {
        title: typia.random<string & tags.MinLength<1> & tags.MaxLength<300>>(),
        postType: "TEXT" as const,
        redditPlatformCommunityId: community.id,
        content: typia.random<string>(),
      } satisfies IRedditPlatformPost.ICreate,
    });
  typia.assert(post);
  // 5-8. Create Member B and C, have them vote
  const memberB: IRedditPlatformMember.IAuthorized =
    await authorize_member_join(connection, {
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
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditPlatformMember.IJoin,
    });
  typia.assert(memberB);
  const memberC: IRedditPlatformMember.IAuthorized =
    await authorize_member_join(connection, {
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
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditPlatformMember.IJoin,
    });
  typia.assert(memberC);
  const memberBConnection: api.IConnection = { host: connection.host };
  memberBConnection.headers = {
    Authorization: memberB.token.access,
  };
  const memberCConnection: api.IConnection = { host: connection.host };
  memberCConnection.headers = {
    Authorization: memberC.token.access,
  };
  // Member B upvotes
  await api.functional.redditPlatform.member.post_votes.cast(
    memberBConnection,
    {
      body: {
        post_id: post.id,
        vote_type: "UPVOTE" as const,
      } satisfies IRedditPlatformPostVote.ICreate,
    },
  );
  // Member C downvotes
  await api.functional.redditPlatform.member.post_votes.cast(
    memberCConnection,
    {
      body: {
        post_id: post.id,
        vote_type: "DOWNVOTE" as const,
      } satisfies IRedditPlatformPostVote.ICreate,
    },
  );
  // 9. Create multiple more members and cast votes to reach >=10 total votes with score near zero
  const moreMembers: IRedditPlatformMember.IAuthorized[] = [];
  const moreMemberConnections: api.IConnection[] = [];
  for (let i = 0; i < 8; i++) {
    const member: IRedditPlatformMember.IAuthorized =
      await authorize_member_join(connection, {
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
          ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IRedditPlatformMember.IJoin,
      });
    typia.assert(member);
    moreMembers.push(member);
    const memberConnection: api.IConnection = { host: connection.host };
    memberConnection.headers = {
      Authorization: member.token.access,
    };
    moreMemberConnections.push(memberConnection);
    // Alternate upvotes and downvotes to keep score near zero
    const voteType: "UPVOTE" | "DOWNVOTE" = i % 2 === 0 ? "UPVOTE" : "DOWNVOTE";
    await api.functional.redditPlatform.member.post_votes.cast(
      memberConnection,
      {
        body: {
          post_id: post.id,
          vote_type: voteType,
        } satisfies IRedditPlatformPostVote.ICreate,
      },
    );
  }
  // Verify post has >=10 total votes with score near zero
  const initialPost: IRedditPlatformPost =
    await api.functional.redditPlatform.posts.at(connection, {
      postId: post.id,
    });
  typia.assert(initialPost);
  // 10. Call controversial feed to verify post appears
  const controversialFeed: IPageIRedditPlatformPost.ISummary =
    await api.functional.redditPlatform.feeds.controversial(connection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies IRedditPlatformPost.IRequest,
    });
  typia.assert(controversialFeed);
  // 11. Verify post is in controversial feed
  const postInFeed = controversialFeed.data.some((p) => p.id === post.id);
  TestValidator.equals("post appears in controversial feed", postInFeed, true);
  TestValidator.predicate(
    "vote_score within [-2, 2] for controversial",
    Math.abs(initialPost.voteScore) <= 2,
  );
  // 12. Cast additional votes to push score outside [-2, 2] range (e.g., 7 upvotes, 3 downvotes = +4)
  // Need 3 more upvotes to get from ~0 to +3, then 1 more to +4
  for (let i = 0; i < 4; i++) {
    await api.functional.redditPlatform.member.post_votes.cast(
      memberBConnection,
      {
        body: {
          post_id: post.id,
          vote_type: "UPVOTE" as const,
        } satisfies IRedditPlatformPostVote.ICreate,
      },
    );
  }
  // Refresh post to see updated score
  const updatedPost: IRedditPlatformPost =
    await api.functional.redditPlatform.posts.at(connection, {
      postId: post.id,
    });
  typia.assert(updatedPost);
  // 13. Call controversial feed again
  const secondControversialFeed: IPageIRedditPlatformPost.ISummary =
    await api.functional.redditPlatform.feeds.controversial(connection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies IRedditPlatformPost.IRequest,
    });
  typia.assert(secondControversialFeed);
  // 14. Verify post is removed from controversial feed
  const postRemovedFromFeed = secondControversialFeed.data.some(
    (p) => p.id === post.id,
  );
  TestValidator.equals(
    "post removed from controversial feed",
    postRemovedFromFeed,
    false,
  );
  TestValidator.predicate(
    "vote_score outside [-2, 2] after additional votes",
    Math.abs(updatedPost.voteScore) > 2,
  );
  // 15. Verify post still accessible via direct endpoint
  TestValidator.equals("post still accessible", updatedPost.id, post.id);
}
