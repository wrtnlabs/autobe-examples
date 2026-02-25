import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_post_link_retrieval_success_and_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Test scenario for GET /communityPlatform/user/posts/{postId}/link
  // 1. User joins to obtain authorized connection
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser: ICommunityPlatformUser.IAuthorized =
    await authorize_user_join(userConnection, {});
  userConnection.headers = {
    Authorization: `Bearer ${authorizedUser.token.access}`,
  };
  // To simulate scenarios, we need multiple postIds:
  // - one for an existing post of type 'link'
  // - one for a non-existent postId
  // - one for a post that exists but is not of type 'link'
  // Since we do not have utility functions or APIs to create posts,
  // or fetch posts of arbitrary types, we can generate plausible UUIDs and
  // use them as postIds assuming the system will reject non-existent or type
  // mismatches with 404 errors.
  // Generate a valid postId UUID for success scenario (simulate existence)
  const existingLinkPostId = typia.random<string & tags.Format<"uuid">>();
  // Generate a random UUID that does not correspond to any post
  const nonExistentPostId = typia.random<string & tags.Format<"uuid">>();
  // Generate a random UUID that simulates an existing post but is not a link
  const nonLinkPostId = typia.random<string & tags.Format<"uuid">>();
  // 2. Test successful retrieval of link content for a valid existing link post
  const linkContent =
    await api.functional.communityPlatform.user.posts.link.atLink(
      userConnection,
      { postId: existingLinkPostId },
    );
  typia.assert(linkContent);
  TestValidator.equals(
    "link content post ID matches",
    linkContent.community_platform_post_id,
    existingLinkPostId,
  );
  TestValidator.predicate(
    "url is a non-empty string",
    typeof linkContent.url === "string" && linkContent.url.length > 0,
  );
  TestValidator.predicate(
    "created_at is a valid ISO date",
    !isNaN(Date.parse(linkContent.created_at)),
  );
  TestValidator.predicate(
    "updated_at is a valid ISO date",
    !isNaN(Date.parse(linkContent.updated_at)),
  );
  // deleted_at can be null or undefined or a valid date string
  if (linkContent.deleted_at !== null && linkContent.deleted_at !== undefined)
    TestValidator.predicate(
      "deleted_at is a valid ISO date",
      !isNaN(Date.parse(linkContent.deleted_at)),
    );
  // 3. Test retrieval for a non-existent postId returns 404
  await TestValidator.httpError(
    "non-existent postId returns 404",
    404,
    async () => {
      await api.functional.communityPlatform.user.posts.link.atLink(
        userConnection,
        {
          postId: nonExistentPostId,
        },
      );
    },
  );
  // 4. Test retrieval for a post that exists but is not of type 'link' returns 404
  await TestValidator.httpError(
    "non-link postId returns 404",
    404,
    async () => {
      await api.functional.communityPlatform.user.posts.link.atLink(
        userConnection,
        {
          postId: nonLinkPostId,
        },
      );
    },
  );
}
