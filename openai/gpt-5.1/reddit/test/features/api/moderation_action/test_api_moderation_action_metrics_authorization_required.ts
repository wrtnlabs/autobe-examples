import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestriction";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerationActionMetrics } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationActionMetrics";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformModerationCaseMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCaseMetadata";

/**
 * Verify authorization requirements and successful retrieval of moderation
 * action metrics.
 *
 * Business purpose:
 *
 * - Ensure that sensitive moderation analytics are only exposed to authenticated
 *   adminUser actors.
 * - Demonstrate that the metrics endpoint correctly returns structured metrics
 *   for an existing moderation action when called with a valid admin session.
 *
 * Scenario:
 *
 * 1. Construct an unauthenticated connection by copying the given connection and
 *    clearing headers.
 * 2. Using that unauthenticated connection, call
 *    api.functional.communityPlatform.adminUser.moderationActions.metrics.at
 *    with a randomly generated UUID for moderationActionId.
 * 3. Wrap the unauthenticated call with TestValidator.error, asserting that some
 *    error is thrown (runtime authorization failure), without depending on
 *    specific HTTP status codes.
 * 4. Next, on the original connection, perform an adminUser join by calling
 *    api.functional.auth.adminUser.join with a valid
 *    ICommunityPlatformAdminUserJoin.IRequest body built from
 *    RandomGenerator/typia.random (username, email, password).
 *
 *    - The join call automatically attaches the issued access token to
 *         connection.headers.Authorization.
 *    - Assert the returned ICommunityPlatformAdminuser.IAuthorized with
 *         typia.assert.
 * 5. With this now-authenticated connection, create a moderation case via
 *    api.functional.communityPlatform.adminUser.moderationCases.create, passing
 *    a concrete ICommunityPlatformModerationCase.ICreate body:
 *
 *    - Case_key: a random string
 *    - Title: a random short paragraph
 *    - Description: explicit null
 *    - Status: e.g. "open"
 *    - Priority: e.g. "high"
 *    - Assigned_adminuser_id: explicit null Assert the created
 *         ICommunityPlatformModerationCase with typia.assert.
 * 6. Create a moderation action header via
 *    api.functional.communityPlatform.adminUser.moderationActions.create using
 *    ICommunityPlatformModerationAction.ICreate:
 *
 *    - Moderation_case_id: the id of the case from step 5
 *    - Account_restriction_id: explicit null
 *    - Action_type: e.g. "warn_user"
 *    - Scope: e.g. "user"
 *    - Reason_category: e.g. "harassment"
 *    - Reason_detail: a random paragraph Assert the returned
 *         ICommunityPlatformModerationAction with typia.assert.
 * 7. Call the metrics endpoint again via
 *    api.functional.communityPlatform.adminUser.moderationActions.metrics.at,
 *    now using the authenticated connection and passing moderationActionId
 *    equal to the created moderation_action.id.
 *
 *    - Assert the response with
 *         typia.assert<ICommunityPlatformModerationActionMetrics>.
 *    - Use TestValidator.equals to verify that metrics.moderation_action_id equals
 *         the created moderation action id.
 *    - If metrics.moderation_action is present, also verify that its id and embedded
 *         moderation_case.id match the created action and case.
 */
export async function test_api_moderation_action_metrics_authorization_required(
  connection: api.IConnection,
) {
  // 1. Prepare an unauthenticated connection by copying the input connection
  //    but clearing its headers. Do not mutate the original connection headers
  //    to respect SDK-managed authentication.
  const unauthenticated: api.IConnection = { ...connection, headers: {} };

  // 2. Call metrics endpoint without any Authorization header and expect an error.
  const randomModerationActionId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "unauthenticated metrics access must be rejected",
    async () => {
      await api.functional.communityPlatform.adminUser.moderationActions.metrics.at(
        unauthenticated,
        {
          moderationActionId: randomModerationActionId,
        },
      );
    },
  );

  // 3. Join as an adminUser to obtain an authenticated context on the original connection.
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 4. Create a moderation case using the authenticated admin connection.
  const moderationCaseBody = {
    case_key: RandomGenerator.alphaNumeric(16),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: null,
    status: "open",
    priority: "high",
    assigned_adminuser_id: null,
  } satisfies ICommunityPlatformModerationCase.ICreate;

  const moderationCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      {
        body: moderationCaseBody,
      },
    );
  typia.assert(moderationCase);

  // 5. Create a moderation action tied to the created case.
  const moderationActionBody = {
    moderation_case_id: moderationCase.id,
    account_restriction_id: null,
    action_type: "warn_user",
    scope: "user",
    reason_category: "harassment",
    reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.adminUser.moderationActions.create(
      connection,
      {
        body: moderationActionBody,
      },
    );
  typia.assert(moderationAction);

  // 6. Retrieve metrics for the created moderation action as an authenticated admin.
  const metrics: ICommunityPlatformModerationActionMetrics =
    await api.functional.communityPlatform.adminUser.moderationActions.metrics.at(
      connection,
      {
        moderationActionId: moderationAction.id,
      },
    );
  typia.assert(metrics);

  // 7. Validate that metrics are associated with the correct moderation action.
  TestValidator.equals(
    "metrics moderation_action_id must match created action id",
    metrics.moderation_action_id,
    moderationAction.id,
  );

  if (metrics.moderation_action !== undefined) {
    TestValidator.equals(
      "embedded moderation_action summary id matches action id",
      metrics.moderation_action.id,
      moderationAction.id,
    );

    TestValidator.equals(
      "embedded moderation_action summary case id matches created case id",
      metrics.moderation_action.moderation_case.id,
      moderationCase.id,
    );
  }
}
