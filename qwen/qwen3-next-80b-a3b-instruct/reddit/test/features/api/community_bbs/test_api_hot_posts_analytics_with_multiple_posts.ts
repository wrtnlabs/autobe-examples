import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { ICommunityBbsSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSection";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsPost";
import { prepare_random_community_bbs_community } from "../../../prepare/prepare_random_community_bbs_community";
import { prepare_random_community_bbs_post } from "../../../prepare/prepare_random_community_bbs_post";
import { generate_random_community_bbs_member_posts_create } from "../../../generate/generate_random_community_bbs_member_posts_create";
import { generate_random_community_bbs_member_communities_create } from "../../../generate/generate_random_community_bbs_member_communities_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_hot_posts_analytics_with_multiple_posts(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin to access analytics endpoint
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityBbsAdmin.IJoin,
  });
  // Step 2: Create first community
  const community1Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(community1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityBbsMember.IJoin,
  });
  const community1 =
    await generate_random_community_bbs_member_communities_create(
      community1Connection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
        } satisfies ICommunityBbsCommunity.ICreate,
      },
    );
  // Step 3: Create second community
  const community2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(community2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityBbsMember.IJoin,
  });
  const community2 =
    await generate_random_community_bbs_member_communities_create(
      community2Connection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
        } satisfies ICommunityBbsCommunity.ICreate,
      },
    );
  // Step 4: Create three posts with varying engagement levels
  // High engagement post in first community: high likes and comments
  const highEngagementPost =
    await generate_random_community_bbs_member_posts_create(
      community1Connection,
      {
        body: {
          community_id: community1.id,
          post_type: "text",
          title: "High Engagement Post",
        } satisfies ICommunityBbsPost.ICreate,
      },
    );
  // Medium engagement post in first community: medium likes
  const mediumEngagementPost =
    await generate_random_community_bbs_member_posts_create(
      community1Connection,
      {
        body: {
          community_id: community1.id,
          post_type: "text",
          title: "Medium Engagement Post",
        } satisfies ICommunityBbsPost.ICreate,
      },
    );
  // Low engagement post in second community: low likes, no comments
  const lowEngagementPost =
    await generate_random_community_bbs_member_posts_create(
      community2Connection,
      {
        body: {
          community_id: community2.id,
          post_type: "text",
          title: "Low Engagement Post",
        } satisfies ICommunityBbsPost.ICreate,
      },
    );
  // Step 5: Use the admin connection to call the hot post analytics endpoint
  const hotPostsResponse =
    await api.functional.communityBbs.admin.analytics.posts.hot.index(
      adminConnection,
    );
  typia.assert(hotPostsResponse);
  // Step 6: Validate that posts are sorted by hot_score in descending order
  // Extract all posts from response and ensure they're sorted correctly
  const posts = hotPostsResponse.data as Array<ICommunityBbsPost>; // Changed from ISummary to ICommunityBbsPost
  const hotScores = posts.map((post) => post.hot_score);
  // Validate that hot_score is in descending order
  for (let i = 0; i < hotScores.length - 1; i++) {
    TestValidator.predicate(
      `hot_score at index ${i} >= hot_score at index ${i + 1}`,
      hotScores[i] >= hotScores[i + 1],
    );
  }
  // Step 7: Validate that each returned post has correct author and community association
  const highPost = posts.find((p) => p.id === highEngagementPost.id);
  const mediumPost = posts.find((p) => p.id === mediumEngagementPost.id);
  const lowPost = posts.find((p) => p.id === lowEngagementPost.id);
  // Find the author from the first community's response after join
  let community1AuthorId: string;
  let community2AuthorId: string;
  // We need to extract the user IDs from the successful join responses, which are returned as ICommunityBbsMember.IAuthorized
  // We must store these for later comparison since we cannot extract IDs from tokens
  const community1Authorized = await authorize_member_join(
    community1Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsMember.IJoin,
    },
  );
  community1AuthorId = community1Authorized.id;
  const community2Authorized = await authorize_member_join(
    community2Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsMember.IJoin,
    },
  );
  community2AuthorId = community2Authorized.id;
  // Verify the high engagement post is present and linked to community1
  TestValidator.equals(
    "high engagement post returned in response",
    highPost !== undefined,
    true,
  );
  if (highPost) {
    TestValidator.equals(
      "high engagement post author matches creator",
      highPost.author.id,
      community1AuthorId,
    );
    TestValidator.equals(
      "high engagement post community matches creation community",
      highPost.community.id,
      community1.id,
    );
  }
  // Verify the medium engagement post is present and linked to community1
  TestValidator.equals(
    "medium engagement post returned in response",
    mediumPost !== undefined,
    true,
  );
  if (mediumPost) {
    TestValidator.equals(
      "medium engagement post author matches creator",
      mediumPost.author.id,
      community1AuthorId,
    );
    TestValidator.equals(
      "medium engagement post community matches creation community",
      mediumPost.community.id,
      community1.id,
    );
  }
  // Verify the low engagement post is present and linked to community2
  TestValidator.equals(
    "low engagement post returned in response",
    lowPost !== undefined,
    true,
  );
  if (lowPost) {
    TestValidator.equals(
      "low engagement post author matches creator",
      lowPost.author.id,
      community2AuthorId,
    );
    TestValidator.equals(
      "low engagement post community matches creation community",
      lowPost.community.id,
      community2.id,
    );
  }
  // Step 8: Validate pagination structure
  TestValidator.equals(
    "pagination data exists",
    hotPostsResponse.pagination !== undefined,
    true,
  );
  if (hotPostsResponse.pagination) {
    TestValidator.equals(
      "pagination current page is 1",
      hotPostsResponse.pagination.current,
      1,
    );
    TestValidator.equals(
      "pagination limit is positive",
      hotPostsResponse.pagination.limit > 0,
      true,
    );
    TestValidator.equals(
      "pagination records is at least 3",
      hotPostsResponse.pagination.records >= 3,
      true,
    );
    TestValidator.equals(
      "pagination pages is at least 1",
      hotPostsResponse.pagination.pages >= 1,
      true,
    );
  }
}
