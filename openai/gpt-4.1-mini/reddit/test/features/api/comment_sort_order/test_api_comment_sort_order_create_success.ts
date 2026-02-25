import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommentSortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentSortOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_community_platform_comment_sort_orders_create } from "../../../generate/generate_random_community_platform_comment_sort_orders_create";
import { prepare_random_community_platform_comment_sort_order } from "../../../prepare/prepare_random_community_platform_comment_sort_order";

export async function test_api_comment_sort_order_create_success(
  connection: api.IConnection,
): Promise<void> {
  // Test creating a new comment sort order with valid input data
  // 1. Use the utility function to generate a new comment sort order
  // 2. Validate the response using typia.assert
  // 3. Verify essential properties and consistency
  const userConnection: api.IConnection = { host: connection.host };
  // Generate a valid comment sort order using utility function
  const created: ICommunityPlatformCommentSortOrder =
    await generate_random_community_platform_comment_sort_orders_create(
      userConnection,
      {},
    );
  // Assert the full response structure
  typia.assert(created);
  // Check properties exist and match input where possible
  TestValidator.predicate(
    "id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      created.id,
    ),
  );
  TestValidator.equals(
    "strategy consistency",
    typeof created.strategy,
    "string",
  );
  TestValidator.equals(
    "sortValue is number",
    typeof created.sortValue,
    "number",
  );
  TestValidator.predicate(
    "createdAt is ISO date string",
    !isNaN(Date.parse(created.createdAt)),
  );
  TestValidator.predicate(
    "updatedAt is ISO date string",
    !isNaN(Date.parse(created.updatedAt)),
  );
  TestValidator.predicate(
    "deletedAt is null or ISO date string",
    created.deletedAt === null ||
      created.deletedAt === undefined ||
      !isNaN(Date.parse(created.deletedAt ?? "")),
  );
  TestValidator.predicate(
    "communityPlatformCommentId is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      created.communityPlatformCommentId,
    ),
  );
}
