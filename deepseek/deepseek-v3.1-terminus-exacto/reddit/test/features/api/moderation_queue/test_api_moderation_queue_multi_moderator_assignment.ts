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

export async function test_api_moderation_queue_multi_moderator_assignment(
  connection: api.IConnection,
): Promise<void> {
  // Create base connections for different actors
  const userConnection: api.IConnection = { host: connection.host };
  const moderator1Connection: api.IConnection = { host: connection.host };
  const moderator2Connection: api.IConnection = { host: connection.host };
  // 1. Create regular user and setup community context
  const userCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    username: RandomGenerator.alphabets(12),
  } satisfies ICommunityPlatformUser.IJoin;
  await authorize_user_join(userConnection, { body: userCredentials });
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
  // 2. Create test content that requires moderation
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
  // 3. Create and authenticate first moderator
  const moderator1Credentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "moderator123",
    username: RandomGenerator.alphabets(8),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformModerator.IJoin;
  const moderator1 = await authorize_moderator_join(moderator1Connection, {
    body: moderator1Credentials,
  });
  typia.assert(moderator1);
  // 4. Create and authenticate second moderator
  const moderator2Credentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "moderator456",
    username: RandomGenerator.alphabets(8),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformModerator.IJoin;
  const moderator2 = await authorize_moderator_join(moderator2Connection, {
    body: moderator2Credentials,
  });
  typia.assert(moderator2);
  // 5. Retrieve moderation queue items for the created post
  const queueResponse =
    await api.functional.communityPlatform.moderator.moderation_queues.index(
      moderator1Connection,
      {
        body: {
          post_id: post.id,
          status: null,
          priority: null,
          moderator_id: null,
          comment_id: null,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformModerationQueue.IRequest,
      },
    );
  typia.assert(queueResponse);
  TestValidator.predicate(
    "should have queue items",
    queueResponse.data.length > 0,
  );
  const queueItem = queueResponse.data[0];
  // 6. Assign queue item to first moderator
  const initialAssignment =
    await api.functional.communityPlatform.moderator.moderation_queues.update(
      moderator1Connection,
      {
        moderationQueueId: queueItem.id,
        body: {
          moderatorId: moderator1.id,
          status: "assigned",
        } satisfies ICommunityPlatformModerationQueue.IUpdate,
      },
    );
  typia.assert(initialAssignment);
  // Validate assignment to first moderator
  TestValidator.equals(
    "assigned to first moderator",
    initialAssignment.moderator?.id,
    moderator1.id,
  );
  TestValidator.predicate(
    "assigned_at timestamp set",
    initialAssignment.assigned_at !== null,
  );
  TestValidator.equals(
    "status is assigned",
    initialAssignment.status,
    "assigned",
  );
  // 7. Reassign queue item to second moderator
  const reassignment =
    await api.functional.communityPlatform.moderator.moderation_queues.update(
      moderator2Connection,
      {
        moderationQueueId: queueItem.id,
        body: {
          moderatorId: moderator2.id,
          status: "assigned",
        } satisfies ICommunityPlatformModerationQueue.IUpdate,
      },
    );
  typia.assert(reassignment);
  // Validate reassignment to second moderator
  TestValidator.equals(
    "reassigned to second moderator",
    reassignment.moderator?.id,
    moderator2.id,
  );
  TestValidator.predicate(
    "assigned_at updated",
    reassignment.assigned_at !== null,
  );
  TestValidator.predicate(
    "new assignment timestamp is after initial",
    new Date(reassignment.assigned_at!) >
      new Date(initialAssignment.assigned_at!),
  );
  // 8. Test unauthorized access attempts
  // Create unauthorized user connection
  const unauthorizedUserConnection: api.IConnection = { host: connection.host };
  const unauthorizedUserCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password789",
    username: RandomGenerator.alphabets(12),
  } satisfies ICommunityPlatformUser.IJoin;
  await authorize_user_join(unauthorizedUserConnection, {
    body: unauthorizedUserCredentials,
  });
  // Attempt unauthorized assignment - should fail
  await TestValidator.error(
    "unauthorized user cannot assign queue",
    async () => {
      await api.functional.communityPlatform.moderator.moderation_queues.update(
        unauthorizedUserConnection,
        {
          moderationQueueId: queueItem.id,
          body: {
            moderatorId: moderator1.id,
            status: "assigned",
          } satisfies ICommunityPlatformModerationQueue.IUpdate,
        },
      );
    },
  );
  // 9. Test workflow progression validation
  const reviewStart =
    await api.functional.communityPlatform.moderator.moderation_queues.update(
      moderator2Connection,
      {
        moderationQueueId: queueItem.id,
        body: {
          status: "in-review",
        } satisfies ICommunityPlatformModerationQueue.IUpdate,
      },
    );
  typia.assert(reviewStart);
  TestValidator.predicate(
    "review started timestamp set",
    reviewStart.review_started_at !== null,
  );
  TestValidator.equals("status is in-review", reviewStart.status, "in-review");
  TestValidator.equals(
    "still assigned to second moderator",
    reviewStart.moderator?.id,
    moderator2.id,
  );
}
