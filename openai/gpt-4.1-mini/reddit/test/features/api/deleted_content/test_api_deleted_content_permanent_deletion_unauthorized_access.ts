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

export async function test_api_deleted_content_permanent_deletion_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // This test scenario verifies that a request to permanently delete a deleted content record without proper admin authentication is rejected with an appropriate authorization error.
  // 1. Prepare admin account with join, but DO NOT authenticate user to test unauthorized access.
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongPassword123!",
    displayName: "AdminUser",
    bio: null,
    avatarUrl: null,
  } satisfies ICommunityPlatformAdmin.IJoin;
  // Join admin account (establish account but don't use token)
  await authorize_admin_join(adminConnection, { body: adminJoinInput });
  // 2. Attempt to permanently delete a random deleted content id WITHOUT admin authentication
  const randomDeletedContentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "unauthorized permanent deletion should fail",
    [401, 403],
    async () => {
      // Use base connection (without token) to call eraseDeletedContent
      await api.functional.communityPlatform.admin.deleted_contents.eraseDeletedContent(
        connection,
        { id: randomDeletedContentId },
      );
    },
  );
}
