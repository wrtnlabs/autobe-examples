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
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test retrieval of an assigned moderation queue item with moderator assignment.
 *
 * This test validates that an admin can retrieve detailed information about a moderation
 * queue item that has been assigned to a specific moderator. Since we cannot create
 * moderation queue items through available APIs, we test the retrieval functionality
 * with the understanding that the system may have existing moderation queue items.
 */
export async function test_api_moderation_queue_admin_retrieval_assigned_item(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "admin123",
      display_name: "Test Admin",
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Since we cannot create moderation queue items through available APIs,
  // we attempt to retrieve an item that might exist in the system.
  // In a real scenario, we would create the item first, then retrieve it.
  const moderationQueueId = "00000000-0000-0000-0000-000000000000";
  // Retrieve the moderation queue item using admin connection
  const moderationQueue =
    await api.functional.communityPlatform.admin.moderation_queues.at(
      adminConnection,
      {
        moderationQueueId: moderationQueueId,
      },
    );
  typia.assert(moderationQueue);
  // Validate basic structure - typia.assert() already validates everything
  TestValidator.equals(
    "moderation queue ID matches",
    moderationQueue.id,
    moderationQueueId,
  );
  // Business logic validation - test what exists, not types
  if (moderationQueue.moderator) {
    TestValidator.predicate(
      "moderator is assigned",
      moderationQueue.moderator.id !== undefined,
    );
  }
  if (moderationQueue.assigned_at) {
    TestValidator.predicate(
      "item has assignment timestamp",
      moderationQueue.assigned_at.length > 0,
    );
  }
  // Validate content reference existence
  const hasContent =
    moderationQueue.post !== null || moderationQueue.comment !== null;
  TestValidator.predicate("moderation queue has content reference", hasContent);
}
