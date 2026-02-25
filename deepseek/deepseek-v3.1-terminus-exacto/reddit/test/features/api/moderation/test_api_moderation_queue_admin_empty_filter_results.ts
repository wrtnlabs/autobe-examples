import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationQueue";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationQueue";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_moderation_queue_admin_empty_filter_results(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Test 1: Filter by non-existent status
  const emptyStatusResult =
    await api.functional.communityPlatform.admin.moderation_queues.index(
      adminConnection,
      {
        body: {
          status: "non_existent_status",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformModerationQueue.IRequest,
      },
    );
  typia.assert(emptyStatusResult);
  TestValidator.equals(
    "empty status result records",
    emptyStatusResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty status result pages",
    emptyStatusResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty status result data length",
    emptyStatusResult.data.length,
    0,
  );
  // Test 2: Filter by non-existent moderator ID
  const emptyModeratorResult =
    await api.functional.communityPlatform.admin.moderation_queues.index(
      adminConnection,
      {
        body: {
          moderator_id: typia.random<string & tags.Format<"uuid">>(),
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformModerationQueue.IRequest,
      },
    );
  typia.assert(emptyModeratorResult);
  TestValidator.equals(
    "empty moderator result records",
    emptyModeratorResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty moderator result pages",
    emptyModeratorResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty moderator result data length",
    emptyModeratorResult.data.length,
    0,
  );
  // Test 3: Filter by non-existent post ID
  const emptyPostResult =
    await api.functional.communityPlatform.admin.moderation_queues.index(
      adminConnection,
      {
        body: {
          post_id: typia.random<string & tags.Format<"uuid">>(),
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformModerationQueue.IRequest,
      },
    );
  typia.assert(emptyPostResult);
  TestValidator.equals(
    "empty post result records",
    emptyPostResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty post result pages",
    emptyPostResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty post result data length",
    emptyPostResult.data.length,
    0,
  );
  // Test 4: Filter by non-existent comment ID
  const emptyCommentResult =
    await api.functional.communityPlatform.admin.moderation_queues.index(
      adminConnection,
      {
        body: {
          comment_id: typia.random<string & tags.Format<"uuid">>(),
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformModerationQueue.IRequest,
      },
    );
  typia.assert(emptyCommentResult);
  TestValidator.equals(
    "empty comment result records",
    emptyCommentResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty comment result pages",
    emptyCommentResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty comment result data length",
    emptyCommentResult.data.length,
    0,
  );
  // Test 5: Combine multiple restrictive filters
  const combinedEmptyResult =
    await api.functional.communityPlatform.admin.moderation_queues.index(
      adminConnection,
      {
        body: {
          status: "non_existent_status",
          priority: "non_existent_priority",
          moderator_id: typia.random<string & tags.Format<"uuid">>(),
          post_id: typia.random<string & tags.Format<"uuid">>(),
          comment_id: typia.random<string & tags.Format<"uuid">>(),
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformModerationQueue.IRequest,
      },
    );
  typia.assert(combinedEmptyResult);
  TestValidator.equals(
    "combined empty result records",
    combinedEmptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "combined empty result pages",
    combinedEmptyResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "combined empty result data length",
    combinedEmptyResult.data.length,
    0,
  );
}
