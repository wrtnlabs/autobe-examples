import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_comments_create_comment } from "../../../generate/generate_random_community_platform_user_comments_create_comment";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";

export async function test_api_comment_deletion_by_moderator_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator joins and logs in
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuthorized = await authorize_moderator_join(
    moderatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.name(),
        displayName: RandomGenerator.name(),
        bio: null,
        avatarUrl: null,
      },
    },
  );
  typia.assert(moderatorAuthorized);
  moderatorConnection.headers = {
    Authorization: moderatorAuthorized.token.access,
  };
  // 2. User joins and logs in
  const userConnection: api.IConnection = { host: connection.host };
  const userAuthorized = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  typia.assert(userAuthorized);
  userConnection.headers = { Authorization: userAuthorized.token.access };
  // 3. User creates a comment
  const comment =
    await generate_random_community_platform_user_comments_create_comment(
      userConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
          postId: typia.random<string & tags.Format<"uuid">>(),
          parentId: null,
        },
      },
    );
  typia.assert(comment);
  // 4. Moderator deletes the user's comment by commentId
  await api.functional.communityPlatform.user.comments.erase(
    moderatorConnection,
    {
      commentId: comment.id,
    },
  );
  // Since the DELETE endpoint returns void/204 no content, no response validation
  // could be done here, but the absence of error means success.
  // Enforced authorization is inherently tested by the ability to perform the operation.
}
