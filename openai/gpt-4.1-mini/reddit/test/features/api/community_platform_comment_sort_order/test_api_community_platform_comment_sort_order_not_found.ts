import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommentSortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentSortOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_platform_comment_sort_order_not_found(
  connection: api.IConnection,
): Promise<void> {
  // This test attempts to retrieve a non-existing comment sort order.
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate a random UUID that is very unlikely to exist
  const fakeId = typia.random<string & tags.Format<"uuid">>();
  // We expect the API call to fail with HTTP 404 Not Found
  await TestValidator.httpError(
    "should return 404 for non-existing comment sort order",
    404,
    async () => {
      await api.functional.communityPlatform.commentSortOrders.at(
        guestConnection,
        {
          commentSortOrderId: fakeId,
        },
      );
    },
  );
}
