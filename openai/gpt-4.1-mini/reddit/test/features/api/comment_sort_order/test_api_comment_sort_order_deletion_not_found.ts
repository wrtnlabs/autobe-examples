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

/**
 * Scenario:
 * Test deleting a comment sort order with a non-existent UUID.
 * 1. Authenticate as admin via /communityPlatform/auth/admin/join
 * 2. Attempt to delete a random non-existent comment sort order UUID
 * 3. Verify that the system returns a 404 error
 */
export async function test_api_comment_sort_order_deletion_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuthorized);
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Attempt to delete a non-existent comment sort order
  const fakeCommentSortOrderId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "delete non-existent comment sort order returns 404",
    404,
    async () => {
      await api.functional.communityPlatform.commentSortOrders.erase(
        adminConnection,
        {
          commentSortOrderId: fakeCommentSortOrderId,
        },
      );
    },
  );
}
