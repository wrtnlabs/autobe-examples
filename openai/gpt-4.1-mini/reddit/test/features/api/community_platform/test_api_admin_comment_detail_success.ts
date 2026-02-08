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

export async function test_api_admin_comment_detail_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successfully retrieve detailed information for an existing comment by its UUID.
  // 1. Register admin account to obtain authorization token
  // 2. Use the authorized admin connection to request comment details
  // 1. Admin registration and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityPlatformAdmin.IJoin>(),
  });
  typia.assert(adminAuthorized);
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = adminAuthorized.token.access;
  // 2. Request a comment detail by UUID
  const commentId = typia.random<string & tags.Format<"uuid">>();
  const comment = await api.functional.communityPlatform.admin.comments.at(
    adminConnection,
    {
      commentId: commentId,
    },
  );
  typia.assert(comment);
}
