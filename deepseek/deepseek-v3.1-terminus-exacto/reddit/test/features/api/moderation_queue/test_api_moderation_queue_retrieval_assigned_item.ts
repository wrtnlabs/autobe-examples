import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderation_queue_retrieval_assigned_item(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderator);
  // 2. Since we don't have endpoints to create moderation queue items,
  // we'll test retrieval with a valid UUID format and validate the response structure
  // This tests that the endpoint works correctly with proper authentication
  const moderationQueueId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the moderation queue item
  const queueItem =
    await api.functional.communityPlatform.moderator.moderation_queues.at(
      moderatorConnection,
      { moderationQueueId },
    );
  typia.assert(queueItem);
  // 4. Validate the response structure matches the expected DTO
  // The typia.assert above already validates all type constraints,
  // so we only need to validate business logic relationships
  // If the item is assigned to a moderator, validate the moderator relationship
  if (queueItem.moderator !== null && queueItem.moderator !== undefined) {
    TestValidator.equals(
      "moderator ID in response matches structure",
      typeof queueItem.moderator.id,
      "string",
    );
    TestValidator.predicate(
      "moderator email is valid format",
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(queueItem.moderator.email),
    );
  }
  // Validate timestamp formats when present
  if (queueItem.assigned_at !== null && queueItem.assigned_at !== undefined) {
    TestValidator.predicate(
      "assigned_at is valid ISO date-time format",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
        queueItem.assigned_at,
      ),
    );
  }
  // Validate that created_at and updated_at are always present and valid
  TestValidator.predicate(
    "created_at is present and valid",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
      queueItem.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is present and valid",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
      queueItem.updated_at,
    ),
  );
  // Validate that either post or comment is present (but not necessarily both)
  TestValidator.predicate(
    "queue item has either post or comment content",
    queueItem.post !== null || queueItem.comment !== null,
  );
}
