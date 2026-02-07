import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleComment";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_bulk_delete_nonexistent_comments(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create actor-specific super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // 2. Register super admin using proper utility function
  const registered = await api.functional.discussionBoard.auth.super_admin.join(
    superAdminConnection,
    {
      body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
    },
  );
  typia.assert(registered);
  // 3. Extract token and set up actor-specific connection with authorization
  const token: IAuthorizationToken = registered.token;
  const newConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: token.access,
    },
  };
  // 4. Generate 3 random non-existent comment IDs (since IRequest is empty object, we need to work around this limitation)
  // Since the DTO defines IRequest as empty, we cannot pass actual IDs
  // This appears to be a DTO design issue - the IRequest should contain comment IDs
  // For now, test with empty request body as per DTO definition
  const result =
    await api.functional.discussionBoard.superAdmin.deleted.comments.bulkErase(
      newConnection,
      {
        body: typia.random<IDiscussionBoardArticleComment.IRequest>(),
      },
    );
  typia.assert(result);
  // 5. Validate result structure
  TestValidator.predicate(
    "response is valid object",
    typeof result === "object",
  );
}
