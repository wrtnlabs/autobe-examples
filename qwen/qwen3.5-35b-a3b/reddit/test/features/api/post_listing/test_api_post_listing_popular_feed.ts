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
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

export async function test_api_post_listing_popular_feed(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member user
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
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
    },
  });
  typia.assert(member);
  // Create member-specific connection with token
  const authenticatedConnection: api.IConnection = { host: connection.host };
  authenticatedConnection.headers = {
    ...memberConnection.headers,
    Authorization: member.token.access,
  };
  // 2. Create communities and posts
  // Community 1 for TEXT post
  const community1 =
    await api.functional.redditPlatform.member.communities.create(
      authenticatedConnection,
      {
        body: {
          name: typia.random<string & tags.MinLength<3>>(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community1);
  // Community 2 for LINK post
  const community2 =
    await api.functional.redditPlatform.member.communities.create(
      authenticatedConnection,
      {
        body: {
          name: typia.random<string & tags.MinLength<3>>(),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community2);
  // Community 3 for IMAGE post
  const community3 =
    await api.functional.redditPlatform.member.communities.create(
      authenticatedConnection,
      {
        body: {
          name: typia.random<string & tags.MinLength<3>>(),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community3);
  // Create TEXT post in community1
  const textPost = await api.functional.redditPlatform.member.posts.create(
    authenticatedConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        postType: "TEXT",
        redditPlatformCommunityId: community1.id,
        content: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(textPost);
  // Create LINK post in community2
  const linkPost = await api.functional.redditPlatform.member.posts.create(
    authenticatedConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        postType: "LINK",
        redditPlatformCommunityId: community2.id,
        url: (typia.random<string & tags.Format<"uri">>() satisfies string as string),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(linkPost);
  // Create IMAGE post in community3
  const imagePost = await api.functional.redditPlatform.member.posts.create(
    authenticatedConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        postType: "IMAGE",
        redditPlatformCommunityId: community3.id,
        imageUrl: (typia.random<string & tags.Format<"uri">>() satisfies string as string),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(imagePost);
  // 3. Call popular feed endpoint
  const response = await api.functional.redditPlatform.posts.index(
    authenticatedConnection,
    {
      body: {
        sort_type: "HOT",
        limit: 20,
        page: 1,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(response);
  // 4. Validate response
  TestValidator.equals("total records", response.pagination.records, 3);
  TestValidator.equals("page limit", response.pagination.limit, 20);
  TestValidator.equals("current page", response.pagination.current, 1);
  TestValidator.equals("total pages", response.pagination.pages, 1);
  // Verify we have exactly 3 posts
  TestValidator.equals("post count", response.data.length, 3);
  // Verify each post exists and has correct type
  const foundTextPost = response.data.find((p) => p.post_type === "TEXT");
  const foundLinkPost = response.data.find((p) => p.post_type === "LINK");
  const foundImagePost = response.data.find((p) => p.post_type === "IMAGE");
  TestValidator.equals("TEXT post found", foundTextPost?.id, textPost.id);
  TestValidator.equals("LINK post found", foundLinkPost?.id, linkPost.id);
  TestValidator.equals("IMAGE post found", foundImagePost?.id, imagePost.id);
  // Verify vote_score and comment_count
  TestValidator.equals("TEXT post vote_score", foundTextPost?.vote_score, 0);
  TestValidator.equals(
    "TEXT post comment_count",
    foundTextPost?.comment_count,
    0,
  );
  TestValidator.equals("LINK post vote_score", foundLinkPost?.vote_score, 0);
  TestValidator.equals(
    "LINK post comment_count",
    foundLinkPost?.comment_count,
    0,
  );
  TestValidator.equals("IMAGE post vote_score", foundImagePost?.vote_score, 0);
  TestValidator.equals(
    "IMAGE post comment_count",
    foundImagePost?.comment_count,
    0,
  );
  // Verify author summary exists for each post
  TestValidator.equals(
    "TEXT post author username",
    foundTextPost?.author.username,
    member.username,
  );
  TestValidator.equals(
    "LINK post author username",
    foundLinkPost?.author.username,
    member.username,
  );
  TestValidator.equals(
    "IMAGE post author username",
    foundImagePost?.author.username,
    member.username,
  );
  // Verify community summaries
  TestValidator.equals(
    "TEXT post community name",
    foundTextPost?.community.name,
    community1.name,
  );
  TestValidator.equals(
    "LINK post community name",
    foundLinkPost?.community.name,
    community2.name,
  );
  TestValidator.equals(
    "IMAGE post community name",
    foundImagePost?.community.name,
    community3.name,
  );
}