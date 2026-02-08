import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_comment_detail_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 3: Attempt to retrieve a non-existent comment by UUID
  // 1. Admin registration to get authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: ICommunityPlatformAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {},
    });
  adminConnection.headers = { Authorization: adminAuth.token.access };
  // 2. Generate a random UUID for a comment that will not exist
  const fakeCommentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to get the comment detail by the fake UUID and expect HTTP 404 error
  await TestValidator.httpError(
    "comment detail not found returns 404",
    404,
    async () => {
      await api.functional.communityPlatform.admin.comments.at(
        adminConnection,
        {
          commentId: fakeCommentId,
        },
      );
    },
  );
}
