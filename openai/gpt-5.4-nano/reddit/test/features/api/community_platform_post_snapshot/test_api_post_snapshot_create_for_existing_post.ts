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

export async function test_api_post_snapshot_create_for_existing_post(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const postId = typia.random<string & tags.Format<"uuid">>();
  const publishedAt = new Date(Date.now()).toISOString();
  const title = RandomGenerator.name();
  const body = RandomGenerator.paragraph({ sentences: 3 });
  const linkUrl = typia.random<string & tags.Format<"uri">>();
  const snapshot =
    await api.functional.communityPlatform.admin.posts.snapshots.createPostSnapshot(
      adminConnection,
      {
        postId,
        body: {
          publishedAt: publishedAt satisfies string & tags.Format<"date-time">,
          title,
          body,
          linkUrl: linkUrl satisfies string & tags.Format<"uri">,
        } satisfies ICommunityPlatformPostSnapshot.ICreate,
      },
    );
  typia.assert(snapshot);
  TestValidator.equals("postId matches", snapshot.postId, postId);
  TestValidator.equals(
    "publishedAt matches",
    snapshot.publishedAt,
    publishedAt,
  );
  TestValidator.equals("title matches", snapshot.title, title);
  TestValidator.equals("body matches", snapshot.body, body);
  const expectedLinkUrl = snapshot.linkUrl === null ? null : linkUrl;
  TestValidator.equals(
    "linkUrl matches postType behavior",
    snapshot.linkUrl,
    expectedLinkUrl,
  );
  TestValidator.predicate(
    "communityId is present",
    snapshot.communityId !== null && snapshot.communityId !== undefined,
  );
  TestValidator.predicate(
    "authorUserId is present",
    snapshot.authorUserId !== null && snapshot.authorUserId !== undefined,
  );
}
