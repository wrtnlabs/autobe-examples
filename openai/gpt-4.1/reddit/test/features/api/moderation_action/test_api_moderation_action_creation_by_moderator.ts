import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validates creation of a moderation action by a moderator in response to a
 * user report.
 *
 * This test ensures:
 *
 * 1. A user (reporter) can join and authenticate.
 * 2. The user creates a report (e.g., reporting a post - here, we test with just a
 *    dummy post id for linkage).
 * 3. A moderator can join and authenticate.
 * 4. The moderator can create a moderation action referencing the created report.
 * 5. The created moderation action includes all required workflow and linking
 *    fields.
 * 6. All references between action and report/entities are present and coherent in
 *    responses.
 *
 * Steps:
 *
 * - Register and login a user
 * - User submits a report (references dummy post id)
 * - Register and login a moderator
 * - Moderator creates a moderation action referencing the report
 * - Validate workflow properties and linkage in the returned moderation action
 */
export async function test_api_moderation_action_creation_by_moderator(
  connection: api.IConnection,
) {
  // 1. Register a user for reporting
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(10);
  const userJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword as string & tags.Format<"password">,
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(userJoin);

  // 2. User login (for token context, but join already does this by SDK update)
  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword as string & tags.Format<"password">,
      href: "https://test.com/login",
      referrer: "https://test.com/",
    } satisfies ICommunityPlatformUser.ILogin,
  });

  // 3. User creates a report (simulate reporting a dummy post id)
  // Use a random uuid to act as the post being reported
  const dummyPostId = typia.random<string & tags.Format<"uuid">>();
  const reportBody = {
    reported_post_id: dummyPostId,
    report_type: RandomGenerator.pick([
      "spam",
      "abuse",
      "harassment",
      "rule_violation",
      "other",
    ] as const),
    reason: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report = await api.functional.communityPlatform.user.reports.create(
    connection,
    {
      body: reportBody,
    },
  );
  typia.assert(report);

  // 4. Register a moderator
  const modEmail = typia.random<string & tags.Format<"email">>();
  const modPassword = RandomGenerator.alphaNumeric(12);
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: modEmail,
      password: modPassword,
      status: "active",
      href: "https://mod.signup.com/",
      referrer: "https://test.com/",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // 5. Moderator login (switch context to moderator)
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: modEmail,
      password: modPassword as string & tags.Format<"password">,
      href: "https://mod.login.com/login",
      referrer: "https://mod.login.com/",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // 6. Moderator creates a moderation action referencing the above report
  const actionTypes = [
    "remove_post",
    "warn_user",
    "mute_user",
    "escalate",
    "ban_user",
    "restore_content",
  ] as const;
  const results = [
    "content_removed",
    "user_muted",
    "report_cleared",
    "escalated",
    "user_banned",
    "content_restored",
  ] as const;
  const statuses = ["in_progress", "completed", "reversed"] as const;
  const createBody = {
    report_id: report.id,
    target_post_id: reportBody.reported_post_id!,
    action_type: RandomGenerator.pick(actionTypes),
    result: RandomGenerator.pick(results),
    status: RandomGenerator.pick(statuses),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction =
    await api.functional.communityPlatform.moderator.moderationActions.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(moderationAction);
  // Validate linkage
  TestValidator.equals(
    "moderation action references correct report",
    moderationAction.report.id,
    report.id,
  );
  TestValidator.equals(
    "moderation action references correct target post",
    moderationAction.targetPost?.id,
    reportBody.reported_post_id,
  );
  // Validate workflow fields
  TestValidator.equals(
    "moderation action type set",
    moderationAction.action_type,
    createBody.action_type,
  );
  TestValidator.equals(
    "moderation action result set",
    moderationAction.result,
    createBody.result,
  );
  TestValidator.equals(
    "moderation action status set",
    moderationAction.status,
    createBody.status,
  );
  // Validate timestamps
  TestValidator.predicate(
    "moderation action created_at present",
    typeof moderationAction.created_at === "string" &&
      moderationAction.created_at.length > 0,
  );
  TestValidator.predicate(
    "moderation action updated_at present",
    typeof moderationAction.updated_at === "string" &&
      moderationAction.updated_at.length > 0,
  );
}
