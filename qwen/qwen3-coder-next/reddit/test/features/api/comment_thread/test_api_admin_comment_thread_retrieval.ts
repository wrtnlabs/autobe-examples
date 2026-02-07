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

export async function test_api_admin_comment_thread_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: typia.random<IRedditPlatformAdmin.IJoin>(),
  });
  typia.assert(adminAuthorized);
  // Create a new connection with the admin token from the authorized response
  const adminTokenConnection: api.IConnection = {
    host: connection.host,
    headers: {
      authorization: adminAuthorized.token.access,
    },
  };
  // Generate a random comment ID for testing
  const testCommentId = typia.random<string & tags.Format<"uuid">>();
  // Test getting comment thread as admin
  const thread = await api.functional.redditPlatform.admin.comments.thread(
    adminTokenConnection,
    {
      commentId: testCommentId,
    },
  );
  typia.assert(thread);
  // Validate the comment has expected properties - using typia.assert to ensure type safety
  typia.assert<IRedditPlatformComment>(thread);
}