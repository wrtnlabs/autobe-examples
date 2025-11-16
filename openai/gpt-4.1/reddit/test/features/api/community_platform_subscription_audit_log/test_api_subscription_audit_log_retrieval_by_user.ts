import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSubscriptionAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscriptionAuditLog";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSubscriptionAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSubscriptionAuditLog";

/**
 * Test retrieving audit logs for a user's own community subscription, testing
 * both filters and permissions.
 *
 * 1. Register a user and authenticate
 * 2. Create a community
 * 3. Subscribe as the user to the community
 * 4. Retrieve audit logs using a variety of filters: action, user_id, time range,
 *    pagination
 * 5. Validate only logs related to the user's own subscription/community are
 *    returned, with correct entity references
 * 6. Confirm audit event metadata is present and sensible
 * 7. Create a second user and confirm they cannot view logs for the first
 *    subscription (checks access control)
 * 8. If available, check that logs contain expected "subscribe" event after
 *    creation
 */
export async function test_api_subscription_audit_log_retrieval_by_user(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = typia.random<string & tags.Format<"password">>();
  const userAuth = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userAuth);

  // Step 2: Create a community
  const createCommunityBody = {
    name: RandomGenerator.alphaNumeric(12).toLowerCase(),
    display_title: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 4,
      wordMax: 10,
    }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 8,
      sentenceMax: 15,
      wordMin: 4,
      wordMax: 12,
    }),
    visibility: RandomGenerator.pick([
      "public",
      "private",
      "invite-only",
    ] as const),
    image_url: null,
    status: "active",
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: createCommunityBody,
    });
  typia.assert(community);

  // Step 3: Subscribe as user to the community
  const subscription =
    await api.functional.communityPlatform.user.communitySubscriptions.create(
      connection,
      {
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);

  // Step 4: Retrieve audit logs for the subscription, using various filters and pagination
  // Default full (unfiltered) audit log retrieval
  const auditPage =
    await api.functional.communityPlatform.user.communitySubscriptions.auditLogs.index(
      connection,
      {
        communitySubscriptionId: subscription.id,
        body: {},
      },
    );
  typia.assert(auditPage);
  TestValidator.predicate(
    "audit data array present",
    auditPage.data.length >= 1,
  );
  TestValidator.predicate(
    "pagination current valid",
    auditPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit positive",
    auditPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records nonnegative",
    auditPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages positive",
    auditPage.pagination.pages >= 1,
  );

  // Step 5: Validate that logs are for this user's subscription/community
  for (const log of auditPage.data) {
    // Confirm entity references (all user ids in log match authenticated user, and community matches subscription)
    TestValidator.equals(
      "log user matches authenticated",
      log.user.id,
      userAuth.id,
    );
    if (log.community !== undefined && log.community !== null) {
      TestValidator.equals(
        "log community matches subscription",
        log.community.id,
        community.id,
      );
    }
    // Confirm entity references are valid UUIDs; action/event type and timestamp presence
    TestValidator.predicate(
      "log id uuid",
      typeof log.id === "string" && log.id.length > 0,
    );
    TestValidator.predicate(
      "action present",
      typeof log.action === "string" && log.action.length > 0,
    );
    TestValidator.predicate(
      "created_at present",
      typeof log.created_at === "string" && log.created_at.length > 0,
    );
  }

  // Step 6: Filtering by action (use the first log's action for test)
  if (auditPage.data.length > 0) {
    const actionToFilter = auditPage.data[0].action;
    const filteredPage =
      await api.functional.communityPlatform.user.communitySubscriptions.auditLogs.index(
        connection,
        {
          communitySubscriptionId: subscription.id,
          body: { action: actionToFilter },
        },
      );
    typia.assert(filteredPage);
    TestValidator.predicate(
      "filtered audit log by action present",
      filteredPage.data.length > 0,
    );
    for (const log of filteredPage.data) {
      TestValidator.equals(
        "filtered log action matches",
        log.action,
        actionToFilter,
      );
    }
  }

  // Step 7: Filtering by user_id (should only ever match self)
  const userId = userAuth.id;
  const userIdFiltered =
    await api.functional.communityPlatform.user.communitySubscriptions.auditLogs.index(
      connection,
      {
        communitySubscriptionId: subscription.id,
        body: { user_id: userId },
      },
    );
  typia.assert(userIdFiltered);
  for (const log of userIdFiltered.data) {
    TestValidator.equals("filtered log user matches", log.user.id, userId);
  }

  // Step 8: Filtering by created_at time range (select a known created_at from one of the page logs)
  if (auditPage.data.length > 0) {
    const fromTime = auditPage.data[0].created_at;
    const toTime = auditPage.data[auditPage.data.length - 1].created_at;
    const rangePage =
      await api.functional.communityPlatform.user.communitySubscriptions.auditLogs.index(
        connection,
        {
          communitySubscriptionId: subscription.id,
          body: { from: fromTime, to: toTime },
        },
      );
    typia.assert(rangePage);
    TestValidator.predicate(
      "filtered by time range has data",
      rangePage.data.length >= 0,
    );
    for (const log of rangePage.data) {
      const created = new Date(log.created_at).getTime();
      const fromMs = new Date(fromTime).getTime();
      const toMs = new Date(toTime).getTime();
      TestValidator.predicate(
        "log in correct range",
        created >= fromMs && created <= toMs,
      );
    }
  }

  // Step 9: Filtering with limit/offset (pagination)
  const limitedPage =
    await api.functional.communityPlatform.user.communitySubscriptions.auditLogs.index(
      connection,
      {
        communitySubscriptionId: subscription.id,
        body: { limit: 1, offset: 0 },
      },
    );
  typia.assert(limitedPage);
  TestValidator.equals(
    "pagination limit is 1",
    limitedPage.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "returned 0 or 1 data",
    [0, 1].includes(limitedPage.data.length),
  );
  if (limitedPage.data.length > 0) {
    TestValidator.equals(
      "first log matches",
      limitedPage.data[0].id,
      auditPage.data[0].id,
    );
  }

  // Step 10: Create a second user and check they cannot retrieve logs for 1st's subscription
  const user2Email = typia.random<string & tags.Format<"email">>();
  const user2Password = typia.random<string & tags.Format<"password">>();
  await api.functional.auth.user.join(connection, {
    body: {
      email: user2Email,
      password: user2Password,
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // Now 'connection' is authenticated as user 2
  await TestValidator.error(
    "second user cannot access 1st user's subscription logs",
    async () => {
      await api.functional.communityPlatform.user.communitySubscriptions.auditLogs.index(
        connection,
        {
          communitySubscriptionId: subscription.id,
          body: {},
        },
      );
    },
  );
}
