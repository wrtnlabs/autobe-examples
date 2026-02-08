import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_post_snapshots_access_and_pagination_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins and logs in
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminJoinConnection, {
    body: {} satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAuthorized);
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {} satisfies ICommunityPlatformAdmin.ILogin,
  });
  // 2. User joins and logs in
  const userJoinConnection: api.IConnection = { host: connection.host };
  const userAuthorized = await authorize_user_join(userJoinConnection, {
    body: {} satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userAuthorized);
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_login(userConnection, {
    body: {} satisfies ICommunityPlatformUser.ILogin,
  });
  // 3. User creates a post
  // Use random post creation body
  const postCreateBody = typia.random<ICommunityPlatformPost.ICreate>();
  const post = await api.functional.communityPlatform.user.posts.create(
    userConnection,
    {
      body: postCreateBody,
    },
  );
  typia.assert(post);
  // Admin requests snapshots of the created post
  if (!('id' in post)) throw new Error('post object does not have id property');
  const snapshotsPage =
    await api.functional.communityPlatform.admin.posts.snapshots.indexSnapshots(
      adminConnection,
      { postId: (post as any).id },
    );
  typia.assert(snapshotsPage);
  // Verify pagination metadata presence
  TestValidator.predicate(
    "pagination object present",
    snapshotsPage.pagination !== null && snapshotsPage.pagination !== undefined,
  );
  // Verify data is an array
  TestValidator.predicate("data is array", Array.isArray(snapshotsPage.data));
  // 4. Create a new post with a user that will have no snapshots
  const postNoUpdates =
    await api.functional.communityPlatform.user.posts.create(userConnection, {
      body: typia.random<ICommunityPlatformPost.ICreate>(),
    });
  typia.assert(postNoUpdates);
  if (!('id' in postNoUpdates)) throw new Error('postNoUpdates object does not have id property');
  const emptySnapshots =
    await api.functional.communityPlatform.admin.posts.snapshots.indexSnapshots(
      adminConnection,
      { postId: (postNoUpdates as any).id },
    );
  typia.assert(emptySnapshots);
  TestValidator.equals(
    "empty snapshots data length",
    emptySnapshots.data.length,
    0,
  );
  // 5. Unauthorized access verification
  // Try without admin authorization
  const baseConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized access denied", async () => {
    await api.functional.communityPlatform.admin.posts.snapshots.indexSnapshots(
      baseConnection,
      {
        postId: (post as any).id,
      },
    );
  });
  // Try with user authorization (non-admin)
  await TestValidator.error("non-admin access denied", async () => {
    await api.functional.communityPlatform.admin.posts.snapshots.indexSnapshots(
      userConnection,
      {
        postId: (post as any).id,
      },
    );
  });
}
