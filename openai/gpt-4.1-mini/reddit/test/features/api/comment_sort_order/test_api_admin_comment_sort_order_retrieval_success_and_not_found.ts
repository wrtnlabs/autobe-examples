import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommentSortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentSortOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_comment_sort_order_retrieval_success_and_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving a comment sort order as an authenticated admin, expect success and 404 for missing
  // 1. Admin registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Use authorize_admin_join utility function for admin join with empty body
  const adminAuth = await authorize_admin_join(adminConnection, { body: {} });
  // Update adminConnection headers with token
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 2. Prepare valid UUID strings for commentId and sortOrderId
  const validCommentId = typia.random<string & tags.Format<"uuid">>();
  const validSortOrderId = typia.random<string & tags.Format<"uuid">>();
  // 3. Successful retrieval test
  const sortOrder =
    await api.functional.communityPlatform.admin.comments.sort_orders.atSortOrder(
      adminConnection,
      {
        commentId: validCommentId,
        sortOrderId: validSortOrderId,
      },
    );
  typia.assert(sortOrder);
  // 4. Not found error test: use random UUIDs unlikely to exist
  const randomCommentId = typia.random<string & tags.Format<"uuid">>();
  const randomSortOrderId = typia.random<string & tags.Format<"uuid">>();
  // Wrap call in error validator with httpError expecting 404
  await TestValidator.httpError(
    "not found error when retrieving non-existent comment sort order",
    404,
    async () => {
      await api.functional.communityPlatform.admin.comments.sort_orders.atSortOrder(
        adminConnection,
        {
          commentId: randomCommentId,
          sortOrderId: randomSortOrderId,
        },
      );
    },
  );
}
