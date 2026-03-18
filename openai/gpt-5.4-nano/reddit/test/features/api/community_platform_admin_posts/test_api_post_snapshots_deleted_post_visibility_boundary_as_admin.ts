import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
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
import { generate_random_community_platform_admin_posts_snapshots_create_post_snapshot } from "../../../generate/generate_random_community_platform_admin_posts_snapshots_create_post_snapshot";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_snapshot } from "../../../prepare/prepare_random_community_platform_post_snapshot";

export async function test_api_post_snapshots_deleted_post_visibility_boundary_as_admin(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const actorConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(actorConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  const postId = typia.random<string & tags.Format<"uuid">>();
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const postTitle = RandomGenerator.paragraph({ sentences: 2 });
  const postBody = RandomGenerator.paragraph({ sentences: 3 });
  await api.functional.communityPlatform.admin.posts.create(actorConnection, {
    body: {
      community_id: communityId,
      post_type: "text",
      title: postTitle,
      body_text: postBody,
    } satisfies ICommunityPlatformPost.ICreate,
  });
  const publishedAt = new Date().toISOString();
  const createdSnapshot =
    await api.functional.communityPlatform.admin.posts.snapshots.createPostSnapshot(
      actorConnection,
      {
        postId,
        body: {
          publishedAt,
          title: RandomGenerator.paragraph({ sentences: 1 }),
          body: RandomGenerator.paragraph({ sentences: 2 }),
          linkUrl: null,
        } satisfies ICommunityPlatformPostSnapshot.ICreate,
      },
    );
  typia.assert(createdSnapshot);
  await api.functional.communityPlatform.admin.posts.erase(actorConnection, {
    postId,
  });
  const processed =
    await api.functional.communityPlatform.admin.posts.snapshots.processSnapshots(
      actorConnection,
      {
        postId,
        body: {
          page: 1,
          limit: 10,
          orderDirection: "desc",
          includeDeleted: false,
        } satisfies ICommunityPlatformPostSnapshot.IRequest,
      },
    );
  typia.assert(processed);
  TestValidator.notEquals(
    "deleted post snapshot should not leak current title",
    processed.title,
    postTitle,
  );
  TestValidator.notEquals(
    "deleted post snapshot should not leak current body",
    processed.body,
    postBody,
  );
}
