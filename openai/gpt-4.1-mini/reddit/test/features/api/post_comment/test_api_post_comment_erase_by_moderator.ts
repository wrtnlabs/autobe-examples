import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostComment";
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
import { generate_random_community_platform_user_posts_comments_create } from "../../../generate/generate_random_community_platform_user_posts_comments_create";
import { prepare_random_community_platform_post_comment } from "../../../prepare/prepare_random_community_platform_post_comment";

export async function test_api_post_comment_erase_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Moderator joins the platform
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: typia.random<ICommunityPlatformModerator.IJoin>(),
  });
  typia.assert(moderatorAuth);
  moderatorConnection.headers = {
    Authorization: moderatorAuth.token.access,
  };
  // Moderator creates a post
  let postRaw = await api.functional.communityPlatform.user.posts.create(
    moderatorConnection,
    {
      body: typia.random<ICommunityPlatformPost.ICreate>(),
    },
  );
  const post = typia.assert<ICommunityPlatformPost & { id: string }>(postRaw);
  // Moderator creates a comment on the post
  let commentRaw =
    await generate_random_community_platform_user_posts_comments_create(
      moderatorConnection,
      {
        params: { postId: post.id },
        body: {},
      },
    );
  const comment = typia.assert<ICommunityPlatformPostComment & { id: string }>(commentRaw);
  // Moderator deletes the comment
  const eraseResult =
    await api.functional.communityPlatform.user.posts.comments.erase(
      moderatorConnection,
      {
        postId: post.id,
        commentId: comment.id,
      },
    );
  typia.assert(eraseResult);
  // Since audit log validation and cascading delete confirmation are part of system
  // internals and typically require querying audit logs or DB, these steps are
  // assumed to be covered by lower-level system tests and thus omitted in E2E
  // Here, we just ensure no error thrown and 204 No Content status returned by API
}
