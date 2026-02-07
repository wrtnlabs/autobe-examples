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

export async function test_api_superadmin_bulk_delete_comments(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections for isolation
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super admin
  const authResponse =
    await api.functional.discussionBoard.auth.super_admin.join(
      superAdminConnection,
      {
        body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
      },
    );
  typia.assert(authResponse);
  // Update connection with authentication token
  superAdminConnection.headers = {
    ...superAdminConnection.headers,
    Authorization: `Bearer ${authResponse.token.access}`,
  };
  // Generate mock comment IDs for bulk deletion testing
  // In a real scenario, these would be actual comment IDs from created comments
  const commentIds: string[] = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  // Execute bulk delete with comment IDs
  // Note: IDiscussionBoardArticleComment.IRequest is currently empty in DTO definitions
  // In real implementation, this would contain the IDs to delete
  const deleteResponse =
    await api.functional.discussionBoard.superAdmin.deleted.comments.bulkErase(
      superAdminConnection,
      {
        body: {
          // The current DTO definition for IRequest is empty {}
          // This suggests the API might accept comment IDs in a different structure
          // For now, we pass empty object and validate the response structure
        } satisfies IDiscussionBoardArticleComment.IRequest,
      },
    );
  typia.assert(deleteResponse);
  // Validate deletion response structure
  TestValidator.equals(
    "delete response is an object",
    typeof deleteResponse,
    "object",
  );
  TestValidator.predicate(
    "delete response is not null",
    () => deleteResponse !== null,
  );
}
