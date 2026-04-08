import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
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

export async function test_api_posts_filtering_by_community(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Get baseline posts without filter to understand total platform data
  const baselineResponse =
    await api.functional.redditPlatform.member.posts.index(memberConnection, {
      body: {
        page: 1,
        limit: 20,
        sort: "new",
      } satisfies IRedditPlatformPost.IRequest,
    });
  typia.assert(baselineResponse);
  // 3. Filter by community_id - get all posts from one community
  const samplePost = baselineResponse.data[0];
  if (!samplePost) {
    TestValidator.predicate(
      "baseline has posts",
      baselineResponse.data.length > 0,
    );
    return;
  }
  const communityId = samplePost.community.id;
  const filteredResponse =
    await api.functional.redditPlatform.member.posts.index(memberConnection, {
      body: {
        page: 1,
        limit: 50,
        sort: "new",
        community_id: communityId,
      } satisfies IRedditPlatformPost.IRequest,
    });
  typia.assert(filteredResponse);
  // Verify all returned posts have matching community_id
  for (const post of filteredResponse.data) {
    TestValidator.equals(
      `post ${post.id} has matching community_id`,
      post.community.id,
      communityId,
    );
  }
  // Verify pagination metadata reflects filtered results, not all platform posts
  TestValidator.equals(
    "pagination records matches filtered count",
    filteredResponse.pagination.records,
    filteredResponse.data.length,
  );
  TestValidator.predicate(
    "filtered records less than or equal to baseline",
    filteredResponse.pagination.records <= baselineResponse.pagination.records,
  );
  // 4. Test community filter with 'hot' sort
  const hotFilteredResponse =
    await api.functional.redditPlatform.member.posts.index(memberConnection, {
      body: {
        page: 1,
        limit: 20,
        sort: "hot",
        community_id: communityId,
      } satisfies IRedditPlatformPost.IRequest,
    });
  typia.assert(hotFilteredResponse);
  // Verify all hot sorted posts still have matching community
  for (const post of hotFilteredResponse.data) {
    TestValidator.equals(
      `hot sorted post ${post.id} has matching community_id`,
      post.community.id,
      communityId,
    );
  }
  // 5. Test with invalid community_id (non-existent UUID)
  const invalidCommunityId = "00000000-0000-0000-0000-000000000000";
  const invalidResponse =
    await api.functional.redditPlatform.member.posts.index(memberConnection, {
      body: {
        page: 1,
        limit: 20,
        sort: "new",
        community_id: invalidCommunityId,
      } satisfies IRedditPlatformPost.IRequest,
    });
  typia.assert(invalidResponse);
  // Verify empty results with valid pagination structure
  TestValidator.equals(
    "invalid community returns empty data",
    invalidResponse.data.length,
    0,
  );
  TestValidator.equals(
    "invalid community pagination records is 0",
    invalidResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "invalid community pagination pages is 0",
    invalidResponse.pagination.pages,
    0,
  );
  // 6. Test combined filters: community_id + title_search
  const searchTitle = samplePost.title.substring(0, 10);
  const combinedResponse =
    await api.functional.redditPlatform.member.posts.index(memberConnection, {
      body: {
        page: 1,
        limit: 20,
        sort: "new",
        community_id: communityId,
        title_search: searchTitle,
      } satisfies IRedditPlatformPost.IRequest,
    });
  typia.assert(combinedResponse);
  // Verify all results have matching community AND title contains search term
  for (const post of combinedResponse.data) {
    TestValidator.equals(
      `combined filter post ${post.id} has matching community_id`,
      post.community.id,
      communityId,
    );
    TestValidator.predicate(
      `combined filter post ${post.id} title contains search term`,
      post.title.toLowerCase().includes(searchTitle.toLowerCase()),
    );
  }
  // 7. Test combined filters: community_id + post_type
  const postType = typia.assert<"text" | "link" | "image">(samplePost.post_type);
  const typeFilteredResponse =
    await api.functional.redditPlatform.member.posts.index(memberConnection, {
      body: {
        page: 1,
        limit: 20,
        sort: "new",
        community_id: communityId,
        post_type: postType,
      } satisfies IRedditPlatformPost.IRequest,
    });
  typia.assert(typeFilteredResponse);
  // Verify all results have matching community AND post_type
  for (const post of typeFilteredResponse.data) {
    TestValidator.equals(
      `type filtered post ${post.id} has matching community_id`,
      post.community.id,
      communityId,
    );
    TestValidator.equals(
      `type filtered post ${post.id} has matching post_type`,
      post.post_type,
      postType,
    );
  }
}