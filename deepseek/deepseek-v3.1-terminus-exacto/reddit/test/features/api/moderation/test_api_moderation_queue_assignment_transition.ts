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

export async function test_api_moderation_queue_assignment_transition(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as moderator and get moderator ID
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_login(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234",
    } satisfies ICommunityPlatformModerator.ILogin,
  });
  typia.assert(moderatorAuth);
  // 2. Create a test post that triggers moderation
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234",
      username: RandomGenerator.alphabets(8),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userAuth);
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  const post = await generate_random_community_platform_user_posts_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Retrieve moderation queue item
  const moderationQueues =
    await api.functional.communityPlatform.moderator.moderation_queues.index(
      moderatorConnection,
      {
        body: {
          post_id: post.id,
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformModerationQueue.IRequest,
      },
    );
  typia.assert(moderationQueues);
  TestValidator.predicate(
    "should find moderation queue item",
    moderationQueues.data.length > 0,
  );
  const queueItem = moderationQueues.data[0];
  // 4. Assign to moderator
  const assignedQueue =
    await api.functional.communityPlatform.moderator.moderation_queues.update(
      moderatorConnection,
      {
        moderationQueueId: queueItem.id,
        body: {
          status: "assigned",
          moderatorId: moderatorAuth.id,
        } satisfies ICommunityPlatformModerationQueue.IUpdate,
      },
    );
  typia.assert(assignedQueue);
  TestValidator.predicate(
    "assigned_at should be set",
    assignedQueue.assigned_at !== null,
  );
  TestValidator.notEquals(
    "status should be assigned",
    assignedQueue.status,
    queueItem.status,
  );
  // 5. Set to in-review
  const inReviewQueue =
    await api.functional.communityPlatform.moderator.moderation_queues.update(
      moderatorConnection,
      {
        moderationQueueId: queueItem.id,
        body: {
          status: "in-review",
        } satisfies ICommunityPlatformModerationQueue.IUpdate,
      },
    );
  typia.assert(inReviewQueue);
  TestValidator.predicate(
    "review_started_at should be set",
    inReviewQueue.review_started_at !== null,
  );
  TestValidator.equals(
    "status should be in-review",
    inReviewQueue.status,
    "in-review",
  );
  // 6. Resolve with proper reasoning
  const resolvedQueue =
    await api.functional.communityPlatform.moderator.moderation_queues.update(
      moderatorConnection,
      {
        moderationQueueId: queueItem.id,
        body: {
          status: "resolved",
          resolution: "approved",
          resolutionReason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformModerationQueue.IUpdate,
      },
    );
  typia.assert(resolvedQueue);
  TestValidator.predicate(
    "resolved_at should be set",
    resolvedQueue.resolved_at !== null,
  );
  TestValidator.equals(
    "status should be resolved",
    resolvedQueue.status,
    "resolved",
  );
  TestValidator.predicate(
    "resolution should be set",
    resolvedQueue.resolution !== null,
  );
  TestValidator.predicate(
    "resolution reason should be set",
    resolvedQueue.resolution_reason !== null,
  );
  // 7. Validate workflow progression
  TestValidator.predicate(
    "assigned_at before review_started_at",
    new Date(assignedQueue.assigned_at!) <
      new Date(inReviewQueue.review_started_at!),
  );
  TestValidator.predicate(
    "review_started_at before resolved_at",
    new Date(inReviewQueue.review_started_at!) <
      new Date(resolvedQueue.resolved_at!),
  );
}
