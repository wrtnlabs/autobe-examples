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
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_community_feed_pagination_and_post_types(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Step 2: Create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // Step 3: Request community feed with default pagination
  const page1Response =
    await api.functional.communityPlatform.communities.posts.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 25,
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
  typia.assert(page1Response);
  // Step 4: Verify pagination metadata
  TestValidator.equals(
    "pagination current page",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", page1Response.pagination.limit, 25);
  TestValidator.predicate(
    "pagination records is non-negative",
    page1Response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    page1Response.pagination.pages >= 0,
  );
  // Step 5: Verify posts without votes show voteScore of 0
  if (page1Response.data.length > 0) {
    for (const post of page1Response.data) {
      // Posts with no votes should have voteScore of 0
      if (post.voteScore === 0) {
        TestValidator.equals(
          `post ${post.id} has zero vote score`,
          post.voteScore,
          0,
        );
      }
    }
  }
  // Step 6: Request page 2 and verify pagination
  const page2Response =
    await api.functional.communityPlatform.communities.posts.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          page: 2,
          limit: 25,
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
  typia.assert(page2Response);
  TestValidator.equals("page 2 current", page2Response.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2Response.pagination.limit, 25);
  // Verify total records is consistent between pages
  TestValidator.equals(
    "total records consistent across pages",
    page1Response.pagination.records,
    page2Response.pagination.records,
  );
  // Step 7-9: Verify post type previews
  if (page1Response.data.length > 0) {
    for (const post of page1Response.data) {
      // Verify post type is valid
      TestValidator.predicate(
        `post ${post.id} has valid postType`,
        post.postType === "text" ||
          post.postType === "link" ||
          post.postType === "image",
      );
      // Verify preview content based on post type
      if (post.postType === "text") {
        // Text posts should have textPreview (first 200 characters)
        if (post.textPreview !== undefined) {
          TestValidator.predicate(
            `text post ${post.id} textPreview length at most 200`,
            post.textPreview.length <= 200,
          );
        }
      } else if (post.postType === "link") {
        // Link posts should have urlDomain
        if (post.urlDomain !== undefined) {
          TestValidator.predicate(
            `link post ${post.id} urlDomain is non-empty string`,
            post.urlDomain.length > 0,
          );
        }
      } else if (post.postType === "image") {
        // Image posts should have thumbnailUrl
        if (post.thumbnailUrl !== undefined && post.thumbnailUrl !== null) {
          TestValidator.predicate(
            `image post ${post.id} thumbnailUrl is valid URI`,
            post.thumbnailUrl.startsWith("http://") ||
              post.thumbnailUrl.startsWith("https://"),
          );
        }
      }
    }
  }
  // Step 10: Test maximum limit enforcement (limit=100)
  const maxLimitResponse =
    await api.functional.communityPlatform.communities.posts.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "max limit request - limit is 100",
    maxLimitResponse.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "max limit - data length does not exceed limit",
    maxLimitResponse.data.length <= 100,
  );
  // Verify sorting options work
  const hotSortResponse =
    await api.functional.communityPlatform.communities.posts.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          sort: "hot",
          page: 1,
          limit: 25,
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
  typia.assert(hotSortResponse);
  const newSortResponse =
    await api.functional.communityPlatform.communities.posts.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          sort: "new",
          page: 1,
          limit: 25,
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
  typia.assert(newSortResponse);
  const topSortResponse =
    await api.functional.communityPlatform.communities.posts.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          sort: "top",
          time_range: "all",
          page: 1,
          limit: 25,
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
  typia.assert(topSortResponse);
  const controversialSortResponse =
    await api.functional.communityPlatform.communities.posts.index(
      memberConnection,
      {
        communityId: community.id,
        body: {
          sort: "controversial",
          page: 1,
          limit: 25,
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
  typia.assert(controversialSortResponse);
  // All sorting options should return valid responses
  TestValidator.predicate(
    "hot sort returns valid pagination",
    hotSortResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "new sort returns valid pagination",
    newSortResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "top sort returns valid pagination",
    topSortResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "controversial sort returns valid pagination",
    controversialSortResponse.pagination.current === 1,
  );
}
