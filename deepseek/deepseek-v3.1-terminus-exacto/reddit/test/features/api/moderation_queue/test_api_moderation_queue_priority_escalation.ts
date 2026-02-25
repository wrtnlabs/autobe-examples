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
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_moderation_queue_priority_escalation(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and register a user
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(12),
    },
  });
  typia.assert(user);
  // Create community using the user
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // Create a post in the community (this should trigger moderation)
  const post = await generate_random_community_platform_user_posts_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        post_type: "text" as const,
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(post);
  // Create moderator connection and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(moderator);
  // Retrieve moderation queue items for the created post
  const queueResponse =
    await api.functional.communityPlatform.moderator.moderation_queues.index(
      moderatorConnection,
      {
        body: {
          post_id: post.id,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformModerationQueue.IRequest,
      },
    );
  typia.assert(queueResponse);
  TestValidator.predicate(
    "queue should contain items for the post",
    queueResponse.data.length > 0,
  );
  const queueSummary = queueResponse.data[0];
  TestValidator.equals(
    "queue item should reference the post",
    queueSummary.post?.id,
    post.id,
  );
  // Get the full queue item by updating it (the update endpoint returns the full entity)
  // First update to set initial priority if needed
  const initialQueue =
    await api.functional.communityPlatform.moderator.moderation_queues.update(
      moderatorConnection,
      {
        moderationQueueId: queueSummary.id,
        body: {
          priority: "normal",
        } satisfies ICommunityPlatformModerationQueue.IUpdate,
      },
    );
  typia.assert(initialQueue);
  // Test priority escalation from normal to critical
  const updatedQueue =
    await api.functional.communityPlatform.moderator.moderation_queues.update(
      moderatorConnection,
      {
        moderationQueueId: queueSummary.id,
        body: {
          priority: "critical",
        } satisfies ICommunityPlatformModerationQueue.IUpdate,
      },
    );
  typia.assert(updatedQueue);
  // Validate priority escalation
  TestValidator.equals(
    "priority should be escalated to critical",
    updatedQueue.priority,
    "critical",
  );
  TestValidator.equals(
    "queue item ID should remain the same",
    updatedQueue.id,
    queueSummary.id,
  );
  TestValidator.equals(
    "post reference should remain",
    updatedQueue.post?.id,
    post.id,
  );
  // Validate workflow state is maintained (timestamps should not change for priority updates)
  TestValidator.equals(
    "assigned_at should remain unchanged",
    updatedQueue.assigned_at,
    initialQueue.assigned_at,
  );
  TestValidator.equals(
    "review_started_at should remain unchanged",
    updatedQueue.review_started_at,
    initialQueue.review_started_at,
  );
  TestValidator.equals(
    "resolved_at should remain unchanged",
    updatedQueue.resolved_at,
    initialQueue.resolved_at,
  );
  // Test that priority field is properly validated by trying invalid values
  await TestValidator.error(
    "should reject invalid priority value",
    async () => {
      await api.functional.communityPlatform.moderator.moderation_queues.update(
        moderatorConnection,
        {
          moderationQueueId: queueSummary.id,
          body: {
            priority: "invalid_priority" as any,
          } satisfies ICommunityPlatformModerationQueue.IUpdate,
        },
      );
    },
  );
}
