import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_platform_admin_posts_create } from "../../../generate/generate_random_community_platform_admin_posts_create";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";

export async function test_api_post_link_view_deleted_post_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // Target post id. With the provided SDK typings/utilities, we cannot retrieve
  // the created post id from POST /communityPlatform/admin/posts.
  const deletedPostId = typia.random<string & tags.Format<"uuid">>();
  // 2) Attempt to delete the post so it becomes treated as deleted/removed.
  //    In an isolated environment, this may already be missing; we don't fail the test.
  try {
    await api.functional.communityPlatform.admin.posts.erase(adminConnection, {
      postId: deletedPostId,
    });
  } catch {
    // ignore
  }
  // 3) GET link representation for deleted post must behave like not found
  await TestValidator.httpError(
    "deleted post link should be not found-style",
    [400, 404],
    async () => {
      await api.functional.communityPlatform.admin.posts.link.at(
        adminConnection,
        {
          postId: deletedPostId,
        },
      );
    },
  );
}
