import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_posts_create } from "../../../generate/generate_random_community_platform_member_communities_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_home_feed_with_posts_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member who will view their Home Feed
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a community that the member will subscribe to
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Create a text post in the subscribed community
  const postTitle = RandomGenerator.name(3);
  const postContent = RandomGenerator.paragraph({
    sentences: 10,
    wordMin: 5,
    wordMax: 8,
  });
  const post =
    await generate_random_community_platform_member_communities_posts_create(
      memberConnection,
      {
        params: { communityId: community.id },
        body: {
          title: postTitle,
          postType: "text",
          content: postContent,
        },
      },
    );
  typia.assert(post);
  // 4. Call Home Feed with 'new' sorting
  const homeFeed =
    await api.functional.communityPlatform.member.home.posts.index(
      memberConnection,
      {
        body: {
          sort: "new",
          page: 1,
          limit: 25,
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
  typia.assert(homeFeed);
  // 5. Verify the response
  TestValidator.predicate(
    "home feed has records",
    homeFeed.pagination.records >= 1,
  );
  TestValidator.predicate(
    "home feed has at least one page",
    homeFeed.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "home feed data is array",
    Array.isArray(homeFeed.data),
  );
  // Find the created post in the feed
  const foundPost = homeFeed.data.find((p) => p.id === post.id);
  TestValidator.predicate(
    "created post appears in home feed",
    foundPost !== undefined,
  );
  if (foundPost) {
    // Verify post summary details
    TestValidator.equals("post title matches", foundPost.title, postTitle);
    TestValidator.equals(
      "post author username",
      foundPost.author.username,
      member.username,
    );
    TestValidator.equals(
      "post community name",
      foundPost.community.name,
      community.name,
    );
    TestValidator.equals("post vote score is 0", foundPost.voteScore, 0);
    TestValidator.equals("post comment count is 0", foundPost.commentCount, 0);
    // Verify textPreview is populated for text posts
    TestValidator.predicate(
      "text preview exists for text post",
      foundPost.textPreview !== undefined,
    );
    if (foundPost.textPreview) {
      TestValidator.predicate(
        "text preview is truncated to 200 chars",
        foundPost.textPreview.length <= 200,
      );
    }
  }
  // 6. Test pagination - get first page with limit 1
  const firstPage =
    await api.functional.communityPlatform.member.home.posts.index(
      memberConnection,
      {
        body: {
          sort: "new",
          page: 1,
          limit: 1,
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals("first page has limit 1", firstPage.pagination.limit, 1);
  TestValidator.predicate(
    "first page has at most 1 item",
    firstPage.data.length <= 1,
  );
  // If there are more pages, verify page navigation
  if (firstPage.pagination.pages > 1) {
    const secondPage =
      await api.functional.communityPlatform.member.home.posts.index(
        memberConnection,
        {
          body: {
            sort: "new",
            page: 2,
            limit: 1,
          } satisfies ICommunityPlatformPost.IRequest,
        },
      );
    typia.assert(secondPage);
    TestValidator.equals(
      "second page number",
      secondPage.pagination.current,
      2,
    );
    TestValidator.predicate(
      "second page has different posts",
      firstPage.data.length === 0 ||
        secondPage.data.length === 0 ||
        firstPage.data[0].id !== secondPage.data[0].id,
    );
  }
}
