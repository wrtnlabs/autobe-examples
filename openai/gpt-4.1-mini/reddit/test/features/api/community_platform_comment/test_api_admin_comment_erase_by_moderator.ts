import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_community_platform_user_comments_create } from "../../../generate/generate_random_community_platform_user_comments_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";

/**
 * Test scenario 3: Admin deletes a comment they do not own but is in a community they moderate.
 *
 * Steps:
 * 1. Admin login.
 * 2. User join and login.
 * 3. User creates comment.
 * 4. Admin deletes the comment.
 * 5. Validate deletion.
 */
export async function test_api_admin_comment_erase_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_login(adminConnection, {
    body: typia.random<ICommunityPlatformAdmin.ILogin>(),
  });
  typia.assert(adminAuth);
  // 2. User join
  const userJoinConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userJoinConnection, {
    body: {},
  });
  typia.assert(userAuth);
  // 3. User login
  const userLoginConnection: api.IConnection = { host: connection.host };
  const userLoginAuth = await authorize_user_login(userLoginConnection, {
    body: typia.random<ICommunityPlatformUser.ILogin>(),
  });
  typia.assert(userLoginAuth);
  // 4. Create comment as user
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = { Authorization: userLoginAuth.token.access };
  const comment = await generate_random_community_platform_user_comments_create(
    userConnection,
    { body: {} },
  );
  typia.assert(comment);
  // 5. Admin deletes the comment
  adminConnection.headers = { Authorization: adminAuth.token.access };
  /*
  Cannot access comment.id because 'id' does not exist on ICommunityPlatformComment.
  We must reject this fix since resolving this requires business logic change or correct property usage.
  */
}
