import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformDeletedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDeletedContent";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_deleted_content_retrieval_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Attempt to get deleted content ID that is presumably existing
  // We must create an admin user and admin auth connection for the purpose of joining
  // But we do not use its token for the unauthorized calls.
  const adminJoinConnection: api.IConnection = { host: connection.host };
  // Perform admin join to create admin user
  await authorize_admin_join(adminJoinConnection, {
    body: {
      email: "unauthorized_admin_test@example.com",
      password: "test1234",
      displayName: "Unauthorized Admin Test",
      bio: null,
      avatarUrl: null,
    },
  });
  // Now make raw request for a random UUID without authorization
  const randomDeletedContentId = typia.random<string & tags.Format<"uuid">>();
  // Create a unauthorized connection with no token
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  // Try call without authorization header
  await TestValidator.httpError(
    "anonymous user cannot access deleted content",
    403,
    async () => {
      await api.functional.communityPlatform.admin.deleted_contents.atDeletedContent(
        unauthorizedConnection,
        { id: randomDeletedContentId },
      );
    },
  );
  // Create a non-admin user connection: simulate as non-admin connection
  // In absence of user join/login utilities, we just create a new connection without token
  const nonAdminConnection: api.IConnection = { host: connection.host };
  // Try call without admin token
  await TestValidator.httpError(
    "non-admin user cannot access deleted content",
    403,
    async () => {
      await api.functional.communityPlatform.admin.deleted_contents.atDeletedContent(
        nonAdminConnection,
        { id: randomDeletedContentId },
      );
    },
  );
}
