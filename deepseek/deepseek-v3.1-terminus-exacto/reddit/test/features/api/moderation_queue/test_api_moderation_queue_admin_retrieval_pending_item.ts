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

export async function test_api_moderation_queue_admin_retrieval_pending_item(
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
  // Retrieve a moderation queue item
  const moderationQueue =
    await api.functional.communityPlatform.admin.moderation_queues.at(
      adminConnection,
      {
        moderationQueueId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(moderationQueue);
  // Validate business logic for pending items
  TestValidator.equals(
    "moderator is null for unassigned item",
    moderationQueue.moderator,
    null,
  );
  TestValidator.equals(
    "resolution fields are null for pending item",
    moderationQueue.resolution,
    null,
  );
  TestValidator.equals(
    "resolution reason is null for pending item",
    moderationQueue.resolution_reason,
    null,
  );
  TestValidator.equals(
    "assignment timestamps are null for pending item",
    moderationQueue.assigned_at,
    null,
  );
  TestValidator.equals(
    "review started timestamp is null for pending item",
    moderationQueue.review_started_at,
    null,
  );
  TestValidator.equals(
    "resolved timestamp is null for pending item",
    moderationQueue.resolved_at,
    null,
  );
  // Validate that content references exist (either post or comment should be present)
  TestValidator.predicate(
    "has either post or comment reference",
    moderationQueue.post !== null || moderationQueue.comment !== null,
  );
}
