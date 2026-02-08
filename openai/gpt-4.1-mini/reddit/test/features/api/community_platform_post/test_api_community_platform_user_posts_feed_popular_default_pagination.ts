import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_community_platform_user_posts_feed_popular_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // This endpoint is publicly accessible, so no authentication connection is needed.
  // Call the popular posts feed endpoint with the base connection
  const output: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.user.posts.feed.popular.index(
      connection,
    );
  // Assert the output structure with typia
  typia.assert(output);
  // Extract pagination and posts array
  const { pagination, data: posts } = output;
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is positive",
    pagination.current >= 1,
  );
  TestValidator.predicate("pagination limit is positive", pagination.limit > 0);
  TestValidator.predicate(
    "pagination records is zero or more",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is zero or more",
    pagination.pages >= 0,
  );
  if (pagination.records === 0) {
    TestValidator.equals(
      "pagination pages = 0 if no records",
      pagination.pages,
      0,
    );
  } else {
    TestValidator.equals(
      "pagination pages matches calculated",
      pagination.pages,
      Math.ceil(pagination.records / pagination.limit),
    );
  }
  // Validate that posts is an array
  TestValidator.predicate("posts is an array", Array.isArray(posts));
  // Since ISummary is empty, no properties to test within posts items
  // Just verify the posts array length is not negative
  TestValidator.predicate("posts count is zero or more", posts.length >= 0);
}
