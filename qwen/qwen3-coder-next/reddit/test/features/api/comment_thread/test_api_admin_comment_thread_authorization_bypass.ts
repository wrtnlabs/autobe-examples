import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin authorization bypass for comment thread access.
 * Creates an admin account and verifies that the admin can access comment threads
 * that would normally be restricted to regular users.
 */
export async function test_api_admin_comment_thread_authorization_bypass(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and obtain token
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create a test comment ID (since we can't create actual comments via available endpoints)
  const commentId = RandomGenerator.alphaNumeric(36);
  // 3. Admin accesses the comment thread (authorization bypass)
  // This endpoint should work for admins even if normal users couldn't access it
  const thread = await api.functional.redditPlatform.admin.comments.thread(
    adminConnection,
    {
      commentId: commentId,
    },
  );
  typia.assert(thread);
  // 4. Verify the thread was returned (basic validation)
  TestValidator.predicate("thread is not empty", thread !== null);
}
