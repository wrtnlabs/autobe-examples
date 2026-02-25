import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_deleted_content_permanent_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: `admin_${Date.now()}@test.com`,
      password: "securePassword123",
      displayName: "TestAdmin",
      bio: null,
      avatarUrl: null,
    },
  });
  typia.assert(adminAuth);
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 2. Prepare a deleted content ID (random UUID for test as no create API)
  const deletedContentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Try deleting with admin (expecting 204 No Content on success)
  await api.functional.communityPlatform.admin.deleted_contents.eraseDeletedContent(
    adminConnection,
    { id: deletedContentId },
  );
  // 4. Try deleting with unauthorized user (no auth header) expecting error
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized deletion attempt",
    401,
    async () => {
      await api.functional.communityPlatform.admin.deleted_contents.eraseDeletedContent(
        unauthorizedConnection,
        { id: deletedContentId },
      );
    },
  );
}
