import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationQueue";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationQueue";

/**
 * Community moderator can list global moderation queues.
 *
 * This test verifies that when a platform administrator has created a
 * platform-wide moderation queue (community_id null), an authenticated
 * community moderator can call the communityModerator moderationQueues index
 * endpoint with appropriate filters and see that global queue in the result.
 *
 * Business flow:
 *
 * 1. Register a platform administrator and obtain an authenticated platformAdmin
 *    context via /auth/platformAdmin/join.
 * 2. Using the platformAdmin context, create a global moderation queue via
 *    /communityPlatform/platformAdmin/moderationQueues by sending an
 *    ICommunityPlatformModerationQueue.ICreate body where community_id is
 *    explicitly null, queue_type is "platform_severe", status is "active", and
 *    name/description are arbitrary strings.
 * 3. Register a community moderator via /auth/communityModerator/join, which also
 *    authenticates the moderator session.
 * 4. Using the communityModerator-authenticated connection, call
 *    /communityPlatform/communityModerator/moderationQueues (PATCH) with a body
 *    of type ICommunityPlatformModerationQueue.IRequest. The request sets
 *    queue_type to "platform_severe" to narrow to the created queue and omits
 *    any restrictive community_id filter so that global queues are eligible.
 * 5. Confirm that the response is a
 *    IPageICommunityPlatformModerationQueue.ISummary page object, that its data
 *    array contains at least one item, and that one of those items matches the
 *    created queue’s id, name, queue_type, status and has community_id
 *    undefined, representing a global queue.
 * 6. Additionally, assert basic pagination invariants such as pagination.records
 *    being greater than or equal to data.length and, when records > 0,
 *    pagination.pages being at least 1.
 */
export async function test_api_moderation_queues_index_for_community_moderator_global_queues(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform administrator
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(16),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. As platform admin, create a global moderation queue (community_id null)
  const globalQueueCreateBody = {
    community_id: null,
    name: `Global Queue ${RandomGenerator.paragraph({ sentences: 1 })}`,
    queue_type: "platform_severe",
    status: "active",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformModerationQueue.ICreate;

  const createdQueue: ICommunityPlatformModerationQueue =
    await api.functional.communityPlatform.platformAdmin.moderationQueues.create(
      connection,
      {
        body: globalQueueCreateBody,
      },
    );
  typia.assert(createdQueue);

  // Ensure it is indeed a global queue
  TestValidator.equals(
    "created queue is global (community_id null)",
    createdQueue.community_id ?? null,
    null,
  );
  TestValidator.equals(
    "created queue has expected queue_type",
    createdQueue.queue_type,
    globalQueueCreateBody.queue_type,
  );
  TestValidator.equals(
    "created queue has expected status",
    createdQueue.status,
    globalQueueCreateBody.status,
  );

  // 3. Register and authenticate a community moderator
  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(16),
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://community.example.com/register",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderator: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderator);

  // 4. As community moderator, list moderation queues with queue_type filter
  const listRequestBody = {
    page: 1,
    pageSize: 50,
    queue_type: globalQueueCreateBody.queue_type,
    status: null,
    community_id: null,
    search: null,
    order_by: null,
    order_direction: null,
  } satisfies ICommunityPlatformModerationQueue.IRequest;

  const page: IPageICommunityPlatformModerationQueue.ISummary =
    await api.functional.communityPlatform.communityModerator.moderationQueues.index(
      connection,
      {
        body: listRequestBody,
      },
    );
  typia.assert(page);

  // 5. Validate pagination invariants
  const pagination = page.pagination;
  TestValidator.predicate(
    "pagination.records is >= 0",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is > 0 when there are records",
    pagination.records === 0 || pagination.limit > 0,
  );
  TestValidator.predicate("pagination.pages is >= 0", pagination.pages >= 0);
  TestValidator.predicate(
    "data length is <= pagination.limit when records > 0",
    pagination.records === 0 || page.data.length <= pagination.limit,
  );

  // 6. Validate that the created global queue is present in the data
  TestValidator.predicate(
    "at least one queue is returned",
    page.data.length > 0,
  );

  const matching = page.data.find((q) => q.id === createdQueue.id);
  TestValidator.predicate(
    "created global queue appears in moderator listing",
    matching !== undefined,
  );

  if (matching !== undefined) {
    TestValidator.equals(
      "matching queue id matches",
      matching.id,
      createdQueue.id,
    );
    TestValidator.equals(
      "matching queue name matches",
      matching.name,
      createdQueue.name,
    );
    TestValidator.equals(
      "matching queue type matches",
      matching.queue_type,
      createdQueue.queue_type,
    );
    TestValidator.equals(
      "matching queue status matches",
      matching.status,
      createdQueue.status,
    );
    TestValidator.equals(
      "matching queue community_id is undefined (global)",
      matching.community_id ?? null,
      null,
    );
  }
}
