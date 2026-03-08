import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
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

export async function test_api_posts_popular_feed_hot_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Call popular feed with hot sorting
  const response = await api.functional.communityPlatform.posts.index(
    connection,
    {
      body: {
        sort: "hot",
        limit: 25,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(response);
  // Validate pagination limit matches request
  TestValidator.equals("pagination limit is 25", response.pagination.limit, 25);
  // Validate content preview is populated based on contentType
  for (const post of response.data) {
    if (post.contentType === "text") {
      TestValidator.predicate(
        "text post has textPreview",
        post.textPreview !== null && post.textPreview !== undefined,
      );
    }
    if (post.contentType === "link") {
      TestValidator.predicate(
        "link post has linkDomain",
        post.linkDomain !== null && post.linkDomain !== undefined,
      );
    }
    if (post.contentType === "image") {
      TestValidator.predicate(
        "image post has thumbnailUrl",
        post.thumbnailUrl !== null && post.thumbnailUrl !== undefined,
      );
    }
  }
}
