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

export async function test_api_comment_update_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator join
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorJoin = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<string & tags.Format<"email">>().split("@")[0],
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 1 }),
      avatarUrl: null,
    },
  });
  typia.assert(moderatorJoin);
  const modConnection: api.IConnection = { host: connection.host };
  modConnection.headers = { Authorization: moderatorJoin.token.access };
  // 2. User join
  const userConnection: api.IConnection = { host: connection.host };
  const userJoin = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "userpwd123",
      username: typia.random<string & tags.Format<"email">>().split("@")[0],
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  typia.assert(userJoin);
  // 3. User creates a comment
  const comment =
    await generate_random_community_platform_user_comments_create_comment(
      userConnection,
      {
        body: {
          content: "Original comment content",
          postId: typia.random<string & tags.Format<"uuid">>(),
          parentId: null,
        },
      },
    );
  typia.assert(comment);
  // 4. Moderator updates the user's comment
  const updatedContent = "Updated comment content by moderator";
  const updated = await api.functional.communityPlatform.user.comments.update(
    modConnection,
    {
      commentId: comment.id,
      body: {
        content: updatedContent,
      },
    },
  );
  typia.assert(updated);
  // 5. Validate results
  TestValidator.equals("updated content", updated.content, updatedContent);
  TestValidator.equals("comment id unchanged", updated.id, comment.id);
  TestValidator.equals(
    "comment author unchanged",
    updated.user.id,
    userJoin.id,
  );
  TestValidator.predicate("isDeleted is false", updated.isDeleted === false);
  TestValidator.predicate(
    "updatedAt is newer",
    new Date(updated.updatedAt).getTime() >
      new Date(comment.updatedAt).getTime(),
  );
  TestValidator.equals(
    "moderator can update other's comment",
    updated.user.id,
    userJoin.id,
  );
}
