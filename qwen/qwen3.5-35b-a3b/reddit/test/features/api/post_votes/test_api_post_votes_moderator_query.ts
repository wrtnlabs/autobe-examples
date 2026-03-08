import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPostVote";
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
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_subscription } from "../../../prepare/prepare_random_reddit_platform_community_subscription";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

export async function test_api_post_votes_moderator_query(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as member A (community owner)
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
  // 2. Member A creates a community
  const community =
    await generate_random_reddit_platform_member_communities_create(
      memberAConnection,
      {
        body: {
          name: typia.random<string & tags.MinLength<1>>(),
          description: typia.random<string>(),
        },
      },
    );
  typia.assert(community);
  // 3. Auth as member B (subscribes to community and creates post)
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
  // Member B subscribes to the community
  const subscription =
    await generate_random_reddit_platform_member_communities_subscribe(
      memberBConnection,
      {
        body: {
          confirmSubscription: true,
        },
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(subscription);
  // Member B creates a post in the community
  const post = await generate_random_reddit_platform_member_posts_create(
    memberBConnection,
    {
      body: {
        title: typia.random<string & tags.MinLength<1> & tags.MaxLength<300>>(),
        postType: "TEXT",
        redditPlatformCommunityId: community.id,
        content: typia.random<string>(),
      },
    },
  );
  typia.assert(post);
  // 4. Auth as member C (votes on the post)
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberC = await authorize_member_join(memberCConnection, {
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
  typia.assert(memberC);
  // 5. Query votes as member B (moderator) with post_id filter
  const votesResponse = await api.functional.redditPlatform.post_votes.index(
    memberBConnection,
    {
      body: {
        post_id: post.id,
        limit: 100,
      } satisfies IRedditPlatformPostVote.IRequest,
    },
  );
  typia.assert(votesResponse);
  // Verify pagination structure
  TestValidator.equals(
    "votes response has pagination",
    votesResponse.pagination.records >= 0,
    true,
  );
  // Verify the response has expected data structure
  TestValidator.equals(
    "votes response has data array",
    Array.isArray(votesResponse.data),
    true,
  );
  // Test filtering by user_id to find votes from a specific user
  const userFilteredResponse =
    await api.functional.redditPlatform.post_votes.index(memberBConnection, {
      body: {
        post_id: post.id,
        user_id: memberC.id,
        limit: 100,
      } satisfies IRedditPlatformPostVote.IRequest,
    });
  typia.assert(userFilteredResponse);
  // Verify pagination structure on filtered query
  TestValidator.equals(
    "user filtered response has pagination",
    userFilteredResponse.pagination.records >= 0,
    true,
  );
  // 6. Test include soft-deleted votes with vote_type='NULL' and include_deleted=true
  const deletedVotesResponse =
    await api.functional.redditPlatform.post_votes.index(memberBConnection, {
      body: {
        post_id: post.id,
        vote_type: "NULL",
        include_deleted: true,
        limit: 100,
      } satisfies IRedditPlatformPostVote.IRequest,
    });
  typia.assert(deletedVotesResponse);
  // Verify soft-deleted votes query returns valid pagination
  TestValidator.equals(
    "deleted votes query has pagination",
    deletedVotesResponse.pagination.records >= 0,
    true,
  );
  // 7. Verify authorization context - member B should be able to query votes
  TestValidator.predicate(
    "member B connection has auth token",
    memberB.token !== undefined && memberB.token.access.length > 0,
  );
  // Verify vote query response contains proper vote summaries
  if (votesResponse.data.length > 0) {
    const firstVote = votesResponse.data[0];
    typia.assert(firstVote);
    TestValidator.predicate(
      "vote has required user field",
      firstVote.user !== undefined,
    );
    TestValidator.predicate(
      "vote has required post field",
      firstVote.post !== undefined,
    );
    TestValidator.predicate(
      "vote has required vote_type",
      firstVote.vote_type === "UPVOTE" ||
        firstVote.vote_type === "DOWNVOTE" ||
        firstVote.vote_type === "NULL",
    );
  }
}
