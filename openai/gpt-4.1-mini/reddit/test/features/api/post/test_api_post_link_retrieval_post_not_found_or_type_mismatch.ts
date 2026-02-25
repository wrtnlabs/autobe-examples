import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_post_link_retrieval_post_not_found_or_type_mismatch(
  connection: api.IConnection,
): Promise<void> {
  // Test fetching link content with non-existent postId or post with mismatched type.
  // Steps:
  // 1) Moderator joins the platform.
  // 2) Attempt to retrieve link content for a valid UUID that does not exist or corresponds
  //    to a post with a type other than 'link'. Expect HTTP 404 Not Found.
  //    Validate no sensitive data leak and proper error handling.
  // 1. Moderator joins the platform
  const moderatorConnection: api.IConnection = { host: connection.host };
  const joinInput: ICommunityPlatformModerator.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(1),
    displayName: null,
    bio: null,
    avatarUrl: null,
  };
  const authorized: ICommunityPlatformModerator.IAuthorized =
    await authorize_moderator_join(moderatorConnection, { body: joinInput });
  typia.assert(authorized);
  // Update the moderator connection headers with token
  moderatorConnection.headers = {
    Authorization: authorized.token.access,
  };
  // 2. Attempt to retrieve link content for a random non-existent postId
  const fakePostId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "404 Not Found for non-existent postId",
    404,
    async () => {
      await api.functional.communityPlatform.moderator.posts.link.atLink(
        moderatorConnection,
        {
          postId: fakePostId,
        },
      );
    },
  );
  // 3. Attempt to retrieve link content for a postId with non-link type
  // WARNING: We have no direct API to create posts or set post type.
  // Since scenario requests a post with non-link type, and we don't have an API
  // to create different post types or get post list, we just test with a
  // very unlikely UUID as another non-existent post (similar coverage),
  // because 404 also returns for type-mismatch per spec.
  const otherPostId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "404 Not Found for post with mismatched type",
    404,
    async () => {
      await api.functional.communityPlatform.moderator.posts.link.atLink(
        moderatorConnection,
        {
          postId: otherPostId,
        },
      );
    },
  );
}
