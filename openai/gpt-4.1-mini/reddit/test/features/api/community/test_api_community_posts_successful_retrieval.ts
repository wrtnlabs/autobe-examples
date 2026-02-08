import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
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
import { generate_random_community_platform_user_communities_create_community } from "../../../generate/generate_random_community_platform_user_communities_create_community";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_community_posts_successful_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Successfully retrieve a paginated list of posts for an existing community.
  // 1. User join authorization
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, { body: {} });
  userConnection.headers ??= {};
  userConnection.headers.Authorization = userAuth.token.access;
  // 2. Generate a random community
  const community =
    await generate_random_community_platform_user_communities_create_community(
      userConnection,
      {},
    );
  typia.assert(
    community as ICommunityPlatformCommunity & {
      id: string;
    },
  );
  // 3. Retrieve paginated posts for the community
  const pagePosts =
    await api.functional.communityPlatform.user.communities.posts.index(
      userConnection,
      {
        communityId: (
          community as ICommunityPlatformCommunity & {
            id: string;
          }
        ).id,
      },
    );
  typia.assert(pagePosts);
  // 4. Validate pagination object exists
  TestValidator.predicate(
    "pagination object exists",
    pagePosts.pagination !== null && typeof pagePosts.pagination === "object",
  );
  // 5. Validate posts array exists
  TestValidator.predicate("posts array exists", Array.isArray(pagePosts.data));
  // 6. Validate pagination fields have sensible numeric values
  TestValidator.predicate(
    "pagination.current >= 0",
    pagePosts.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit >= 0",
    pagePosts.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records >= 0",
    pagePosts.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages >= 0",
    pagePosts.pagination.pages >= 0,
  );
  // 7. Validate posts count does not exceed pagination limit
  TestValidator.predicate(
    "posts count <= pagination.limit",
    pagePosts.data.length <= pagePosts.pagination.limit,
  );
  // 8. Validate each post with typia.assert only due to unknown properties
  for (const post of pagePosts.data) {
    typia.assert(post);
  }
}
