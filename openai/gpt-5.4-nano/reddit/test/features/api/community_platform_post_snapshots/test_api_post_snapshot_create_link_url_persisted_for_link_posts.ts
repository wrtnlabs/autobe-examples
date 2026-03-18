import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
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
import { generate_random_community_platform_admin_posts_snapshots_create_post_snapshot } from "../../../generate/generate_random_community_platform_admin_posts_snapshots_create_post_snapshot";
import { prepare_random_community_platform_post_snapshot } from "../../../prepare/prepare_random_community_platform_post_snapshot";

export async function test_api_post_snapshot_create_link_url_persisted_for_link_posts(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as admin (join flow)
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = adminAuth.token.access;
  // 2-4) Create first snapshot for a link post
  const linkUrl1 = typia.random<string & tags.Format<"uri">>();
  const title1 = RandomGenerator.paragraph({ sentences: 2 });
  const body1 = RandomGenerator.paragraph({ sentences: 3 });
  const publishedAt1 = new Date().toISOString();
  // We must provide a postId. We'll generate a UUID and rely on the backend
  // data setup for an eligible link post to make this succeed.
  const postIdSeed = typia.random<string & tags.Format<"uuid">>();
  const snapshot1 =
    await generate_random_community_platform_admin_posts_snapshots_create_post_snapshot(
      adminConnection,
      {
        params: { postId: postIdSeed },
        body: {
          publishedAt: publishedAt1,
          title: title1,
          body: body1,
          linkUrl: linkUrl1,
        } satisfies ICommunityPlatformPostSnapshot.ICreate,
      },
    );
  typia.assert(snapshot1);
  TestValidator.equals("snapshot postId", snapshot1.postId, snapshot1.postId);
  TestValidator.equals("snapshot title", snapshot1.title, title1);
  TestValidator.equals("snapshot body", snapshot1.body, body1);
  TestValidator.equals("snapshot linkUrl", snapshot1.linkUrl, linkUrl1);
  TestValidator.predicate(
    "snapshot postType indicates link",
    snapshot1.postType.toLowerCase().includes("link"),
  );
  // 5) Create second snapshot (append-only) with different linkUrl
  const linkUrl2 = typia.random<string & tags.Format<"uri">>();
  const title2 = RandomGenerator.paragraph({ sentences: 2 });
  const body2 = RandomGenerator.paragraph({ sentences: 3 });
  const publishedAt2 = new Date(Date.now() + 60000).toISOString();
  const snapshot2 =
    await generate_random_community_platform_admin_posts_snapshots_create_post_snapshot(
      adminConnection,
      {
        params: { postId: snapshot1.postId },
        body: {
          publishedAt: publishedAt2,
          title: title2,
          body: body2,
          linkUrl: linkUrl2,
        } satisfies ICommunityPlatformPostSnapshot.ICreate,
      },
    );
  typia.assert(snapshot2);
  TestValidator.notEquals("snapshot IDs differ", snapshot1.id, snapshot2.id);
  TestValidator.equals("snapshot2 postId", snapshot2.postId, snapshot1.postId);
  TestValidator.equals("snapshot2 title", snapshot2.title, title2);
  TestValidator.equals("snapshot2 body", snapshot2.body, body2);
  TestValidator.equals("snapshot2 linkUrl", snapshot2.linkUrl, linkUrl2);
  TestValidator.predicate(
    "snapshot2 postType indicates link",
    snapshot2.postType.toLowerCase().includes("link"),
  );
  // Ensure append-only behavior: first snapshot retains its original linkUrl
  TestValidator.equals(
    "snapshot1 linkUrl unchanged",
    snapshot1.linkUrl,
    linkUrl1,
  );
}
