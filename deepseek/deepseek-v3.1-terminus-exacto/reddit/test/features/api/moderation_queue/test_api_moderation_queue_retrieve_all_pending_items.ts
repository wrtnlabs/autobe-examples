import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderation_queue_retrieve_all_pending_items(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator connection and authenticate
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
  // Retrieve pending moderation queue items with default pagination
  const queueResult =
    await api.functional.communityPlatform.moderator.moderation_queues.index(
      moderatorConnection,
      {
        body: {
          status: null,
          priority: null,
          moderator_id: null,
          post_id: null,
          comment_id: null,
          page: undefined,
          limit: undefined,
        } satisfies ICommunityPlatformModerationQueue.IRequest,
      },
    );
  typia.assert(queueResult);
  // Validate pagination structure
  TestValidator.equals(
    "pagination structure",
    typeof queueResult.pagination,
    "object",
  );
  TestValidator.predicate(
    "has pagination properties",
    () =>
      "current" in queueResult.pagination &&
      "limit" in queueResult.pagination &&
      "records" in queueResult.pagination &&
      "pages" in queueResult.pagination,
  );
  // Validate pagination values
  TestValidator.predicate(
    "current page >= 0",
    queueResult.pagination.current >= 0,
  );
  TestValidator.predicate("limit >= 0", queueResult.pagination.limit >= 0);
  TestValidator.predicate("records >= 0", queueResult.pagination.records >= 0);
  TestValidator.predicate("pages >= 0", queueResult.pagination.pages >= 0);
  // Validate moderation queue items structure
  TestValidator.equals("data is array", Array.isArray(queueResult.data), true);
  for (const item of queueResult.data) {
    // Validate required item properties
    TestValidator.predicate("has id", typeof item.id === "string");
    TestValidator.predicate("has status", typeof item.status === "string");
    TestValidator.predicate("has priority", typeof item.priority === "string");
    TestValidator.predicate(
      "has assigned_at",
      item.assigned_at === null || typeof item.assigned_at === "string",
    );
    TestValidator.predicate(
      "has review_started_at",
      item.review_started_at === null ||
        typeof item.review_started_at === "string",
    );
    TestValidator.predicate(
      "has resolved_at",
      item.resolved_at === null || typeof item.resolved_at === "string",
    );
    TestValidator.predicate(
      "has resolution",
      item.resolution === null || typeof item.resolution === "string",
    );
    TestValidator.predicate(
      "has resolution_reason",
      item.resolution_reason === null ||
        typeof item.resolution_reason === "string",
    );
    // Validate embedded moderator structure if present
    if (item.moderator !== null) {
      TestValidator.predicate(
        "moderator has id",
        typeof item.moderator.id === "string",
      );
      TestValidator.predicate(
        "moderator has email",
        typeof item.moderator.email === "string",
      );
      TestValidator.predicate(
        "moderator has username",
        typeof item.moderator.username === "string",
      );
      TestValidator.predicate(
        "moderator has display_name",
        typeof item.moderator.display_name === "string",
      );
      TestValidator.predicate(
        "moderator has is_active",
        typeof item.moderator.is_active === "boolean",
      );
      TestValidator.predicate(
        "moderator has permission_level",
        typeof item.moderator.permission_level === "string",
      );
    }
    // Validate that at least one content reference exists (post or comment)
    TestValidator.predicate(
      "has post or comment reference",
      item.post !== null || item.comment !== null,
    );
  }
}
