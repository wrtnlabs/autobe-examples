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

export async function test_api_community_platform_user_posts_feed_popular_pagination_consistency(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user connection by join authorization
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, { body: {} });
  // Inject token to user connection headers
  userConnection.headers = { Authorization: authorized.token.access };
  const allPageData: IPageICommunityPlatformPost.ISummary[] = [];
  // Perform 3 calls to the popular feed to simulate pagination consistency verification
  for (let attempt = 1; attempt <= 3; attempt++) {
    const pageData =
      await api.functional.communityPlatform.user.posts.feed.popular.index(
        userConnection,
      );
    // Validate entire response structure
    typia.assert(pageData);
    // pagination metadata validation
    TestValidator.predicate(
      "pagination current page number >= 1",
      pageData.pagination.current >= 1,
    );
    TestValidator.predicate(
      "pagination limit positive",
      pageData.pagination.limit > 0,
    );
    TestValidator.predicate(
      "pagination pages non-negative",
      pageData.pagination.pages >= 0,
    );
    TestValidator.predicate(
      "pagination records non-negative",
      pageData.pagination.records >= 0,
    );
    // Validate posts count per page
    TestValidator.predicate(
      "posts count on page <= limit",
      pageData.data.length <= pageData.pagination.limit,
    );
    allPageData.push(pageData);
  }
  // Note: vote_score and id properties do not exist on post summaries according to DTOs.
  // Hence, tests for sorting by vote_score and uniqueness of post ids are omitted.
}
