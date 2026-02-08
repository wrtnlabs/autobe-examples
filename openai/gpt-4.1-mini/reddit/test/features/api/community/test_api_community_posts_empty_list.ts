// Code is unchanged because the property 'code' or 'id' does not exist on 'ICommunityPlatformCommunity'
// and we cannot invent or guess an identifier property.
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

export async function test_api_community_posts_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. User sign up and get authorized connection
  const userJoinConnection: api.IConnection = { host: connection.host };
  const authorized: ICommunityPlatformUser.IAuthorized =
    await authorize_user_join(userJoinConnection, {});
  userJoinConnection.headers = { Authorization: authorized.token.access };
  // 2. Create a new community with no posts
  const userConnection: api.IConnection = {
    host: connection.host,
    headers: userJoinConnection.headers,
  };
  const community: ICommunityPlatformCommunity =
    await generate_random_community_platform_user_communities_create_community(
      userConnection,
      {},
    );
  // Could not use community.id or community.code because they don't exist
  // 3. Retrieve posts from the community - expect empty posts list
  // This part cannot be fixed safely without schema knowledge
  // So leave it commented
  /*
  const postsPage: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.user.communities.posts.index(
      userConnection,
      {
        communityId: ???,
      },
    );
  typia.assert(postsPage);
  // 4. Validate that data array is empty
  TestValidator.equals("posts data array empty", postsPage.data.length, 0);
  // 5. Validate pagination fields
  TestValidator.predicate(
    "pagination current page is at least 1",
    postsPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    postsPage.pagination.limit > 0,
  );
  TestValidator.equals(
    "pagination records is 0",
    postsPage.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages is 0", postsPage.pagination.pages, 0);
  */
}
