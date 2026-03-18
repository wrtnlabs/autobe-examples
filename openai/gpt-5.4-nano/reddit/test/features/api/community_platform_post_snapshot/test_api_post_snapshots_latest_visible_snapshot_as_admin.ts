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

export async function test_api_post_snapshots_latest_visible_snapshot_as_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin auth
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  };
  const authorized = await authorize_admin_join(
    adminConnection,
    adminCredentials,
  );
  typia.assert(authorized);
  // 2) Create a post (must exist and not be soft-deleted)
  const postConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(postConnection, {
    body: {
      email: adminCredentials.body.email,
      password: adminCredentials.body.password,
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // Generator creates a random post; we need its id, so we recreate via SDK-less flow:
  // Use snapshots generator which requires postId, so we still must obtain postId.
  // Create one post using the SDK create endpoint's response shape is void per contract,
  // so we instead rely on the snapshot create utility returning snapshot which includes postId.
  // First create a post via the same generator and capture its postId indirectly by creating snapshots.
  // We generate a snapshot by passing a prepared postId, so we need postId.
  // Therefore, we must call admin.posts.create to obtain post id.
  // But that SDK method is void; the project provides a generator that doesn't return the post.
  // Fallback: create snapshots using postId obtained from the response of admin.posts.create is impossible.
  // Rewrite: use createPostSnapshot utility with params.postId from a new generated UUID and expect 404 would fail.
  // Hence we must use the existing generator for posts creation even if it returns void, and obtain postId via snapshot creation response.
  // Snapshot creation generator requires postId in params; thus we still cannot proceed.
  throw new Error(
    "Cannot implement without a way to obtain created postId from available utilities/SDK contracts: admin.posts.create is void and postId is required for snapshot creation.",
  );
}
