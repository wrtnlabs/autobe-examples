import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationQueue";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Verify that a community moderator can retrieve a global moderation queue
 * created by a platform administrator.
 *
 * Business intent:
 *
 * - Platform admins configure moderation queues, including platform-wide queues
 *   that are not tied to a specific community (community_id = null).
 * - Community moderators should be able to see these global queues when
 *   authorized, via the communityModerator-facing moderationQueues.at
 *   endpoint.
 *
 * Test steps (happy path only, no type-error scenarios):
 *
 * 1. Register a platform administrator via auth.platformAdmin.join using
 *    ICommunityPlatformPlatformadmin.IJoin with realistic values.
 * 2. Using the same connection (which now carries the platformAdmin token set by
 *    the join call), create a global moderation queue via
 *    communityPlatform.platformAdmin.moderationQueues.create with a body that
 *    satisfies ICommunityPlatformModerationQueue.ICreate:
 *
 *    - Community_id explicitly set to null (to guarantee platform-wide scope).
 *    - Name set to some random but deterministic test string.
 *    - Queue_type set to a plausible platform-wide type string (e.g.,
 *         "platform_severe").
 *    - Status set to a plausible lifecycle value (e.g., "active").
 *    - Description optionally set to some random paragraph.
 * 3. Assert that the create response is a valid ICommunityPlatformModerationQueue
 *    using typia.assert, and keep its id and core fields for later comparison.
 * 4. Register a community moderator via auth.communityModerator.join using
 *    ICommunityPlatformCommunityModerator.IJoin.
 * 5. Optionally perform an explicit communityModerator.login using
 *    ICommunityPlatformCommunityModerator.ILogin to demonstrate actor
 *    switching, even though join has already attached a moderator token. This
 *    ensures the connection is clearly in communityModerator context before
 *    retrieving the queue.
 * 6. Invoke communityPlatform.communityModerator.moderationQueues.at with
 *    moderationQueueId equal to the id of the created global queue.
 * 7. Use typia.assert on the response to fully validate it as
 *    ICommunityPlatformModerationQueue.
 * 8. Use TestValidator.equals and TestValidator.predicate to perform
 *    business-oriented checks:
 *
 *    - The retrieved id equals the created queue id.
 *    - Community_id is strictly null in the response (indicating global scope).
 *    - Name, queue_type, and status match the values from creation.
 * 9. Optionally verify that created_at and updated_at are non-empty strings;
 *    however, trust typia.assert for format validation and avoid manual regex
 *    checks.
 *
 * Constraints and guardrails:
 *
 * - No direct manipulation of connection.headers (tokens are handled by SDK).
 * - No TestValidator.error around the happy path retrieval; this scenario is
 *   about a successful authorized read.
 * - Do not attempt to validate HTTP status codes explicitly; rely on the fact
 *   that a thrown HttpError would fail the test.
 * - Do not create any tests that intentionally send wrong types or omit required
 *   fields; all request bodies must satisfy their DTO types using the
 *   `satisfies` operator.
 */
export async function test_api_moderation_queue_retrieval_by_community_moderator_for_global_queue(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator; SDK will attach platformAdmin token
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin = await api.functional.auth.platformAdmin.join(
    connection,
    { body: platformAdminJoinBody },
  );
  typia.assert(platformAdmin);

  // 2. Create a global (platform-wide) moderation queue as platform admin
  const queueName = `global-queue-${RandomGenerator.alphabets(8)}`;
  const queueType = "platform_severe";
  const queueStatus = "active";
  const createQueueBody = {
    community_id: null,
    name: queueName,
    queue_type: queueType,
    status: queueStatus,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformModerationQueue.ICreate;

  const createdQueue =
    await api.functional.communityPlatform.platformAdmin.moderationQueues.create(
      connection,
      { body: createQueueBody },
    );
  typia.assert(createdQueue);

  // Basic sanity checks on created queue
  TestValidator.equals(
    "created queue name should match input name",
    createdQueue.name,
    queueName,
  );
  TestValidator.equals(
    "created queue type should match input type",
    createdQueue.queue_type,
    queueType,
  );
  TestValidator.equals(
    "created queue status should match input status",
    createdQueue.status,
    queueStatus,
  );
  TestValidator.equals(
    "created queue community_id should be null for global queue",
    createdQueue.community_id,
    null,
  );

  // 3. Register a community moderator (join also authenticates as moderator)
  const communityModeratorJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://moderator.example.com/register",
    referrer: "https://moderator.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const communityModerator = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: communityModeratorJoinBody,
    },
  );
  typia.assert(communityModerator);

  // 4. Explicitly login as the newly created community moderator to ensure
  //    the connection is in communityModerator context.
  const moderatorLoginBody = {
    identifier: communityModeratorJoinBody.email,
    password: communityModeratorJoinBody.password,
    ip: "127.0.0.1",
    href: "https://moderator.example.com/login",
    referrer: "https://moderator.example.com/register",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorAuthorized);

  // 5. Retrieve the moderation queue via the communityModerator endpoint
  const fetchedQueue =
    await api.functional.communityPlatform.communityModerator.moderationQueues.at(
      connection,
      { moderationQueueId: createdQueue.id },
    );
  typia.assert(fetchedQueue);

  // 6. Business assertions comparing created vs fetched queue
  TestValidator.equals(
    "fetched queue id should equal created queue id",
    fetchedQueue.id,
    createdQueue.id,
  );

  TestValidator.equals(
    "fetched queue community_id should be null (global queue)",
    fetchedQueue.community_id,
    null,
  );

  TestValidator.equals(
    "fetched queue name should match created queue name",
    fetchedQueue.name,
    createdQueue.name,
  );

  TestValidator.equals(
    "fetched queue type should match created queue type",
    fetchedQueue.queue_type,
    createdQueue.queue_type,
  );

  TestValidator.equals(
    "fetched queue status should match created queue status",
    fetchedQueue.status,
    createdQueue.status,
  );

  // 7. Ensure created_at and updated_at are present; typia.assert already
  //    guarantees date-time format, so we just check that they exist.
  TestValidator.predicate(
    "fetched queue created_at should be a non-empty string",
    fetchedQueue.created_at.length > 0,
  );

  TestValidator.predicate(
    "fetched queue updated_at should be a non-empty string",
    fetchedQueue.updated_at.length > 0,
  );
}
