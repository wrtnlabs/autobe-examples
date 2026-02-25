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
import { generate_random_community_platform_comment_sort_orders_create } from "../../../generate/generate_random_community_platform_comment_sort_orders_create";
import { prepare_random_community_platform_comment_sort_order } from "../../../prepare/prepare_random_community_platform_comment_sort_order";

export async function test_api_comment_sort_order_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {});
  adminConnection.headers = { Authorization: adminAuthorized.token.access };
  // 2. Create new comment sort order record
  // We need valid commentPlatformCommentId to create;
  // Since no direct API is provided for comments, we'll mock a UUID for commentPlatformCommentId
  // using typia.random<string & tags.Format<"uuid">>()
  const createBody: ICommunityPlatformCommentSortOrder.ICreate = {
    communityPlatformCommentId: typia.random<string & tags.Format<"uuid">>(),
    strategy: "best",
    sortValue: 100.0,
  };
  const createdSortOrder =
    await generate_random_community_platform_comment_sort_orders_create(
      adminConnection,
      {
        body: createBody,
      },
    );
  typia.assert(createdSortOrder);
  // 3. Delete the created comment sort order record
  await api.functional.communityPlatform.commentSortOrders.erase(
    adminConnection,
    {
      commentSortOrderId: createdSortOrder.id,
    },
  );
  // 4. Verify the comment sort order is deleted
  // Since no GET API to verify deletion, we verify deletion by trying to delete again and expecting 404
  await TestValidator.error(
    "delete non-existing comment sort order",
    async () => {
      await api.functional.communityPlatform.commentSortOrders.erase(
        adminConnection,
        {
          commentSortOrderId: createdSortOrder.id,
        },
      );
    },
  );
}
