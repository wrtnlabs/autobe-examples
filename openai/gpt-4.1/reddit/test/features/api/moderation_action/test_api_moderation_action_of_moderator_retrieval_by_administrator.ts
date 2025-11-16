import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerationActionOfModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationActionOfModerator";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModeratorSession";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Verifies that an administrator can retrieve detailed information for a
 * moderator-specific action record linked to a moderation action.
 *
 * This test exercises the following workflow:
 *
 * 1. Register a unique administrator account and authenticate.
 * 2. Register a unique moderator account and authenticate for future use.
 * 3. As the administrator, create a new moderation action (requires a report
 *    reference).
 * 4. Switch authentication to the moderator.
 * 5. As the moderator, create a moderator-specific action for the moderation
 *    action.
 * 6. Switch authentication back to the administrator.
 * 7. Retrieve details for the moderator's action as the administrator via the GET
 *    endpoint.
 * 8. Validate all critical fields are present, correct, and match expected
 *    references (moderator and session), including audit/compliance fields.
 */
export async function test_api_moderation_action_of_moderator_retrieval_by_administrator(
  connection: api.IConnection,
) {
  // 1. Register administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        business_status: "active",
      },
    },
  );
  typia.assert(administrator);
  // 2. Register moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderatorCreation = await api.functional.auth.moderator.join(
    connection,
    {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        status: "active",
        href: "https://test.moderator.join",
        referrer: "https://test.homepage",
        ip: null,
      },
    },
  );
  typia.assert(moderatorCreation);
  // 3. Switch back to admin (in case SDK changed token on moderator join)
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://test.admin.login",
      referrer: "https://test.homepage",
      ip: null,
    },
  });
  // 4. Create moderation action as administrator
  // We have to fake a report_id since creation requires one (use random uuid)
  const fakeReportId = typia.random<string & tags.Format<"uuid">>();
  const moderationAction =
    await api.functional.communityPlatform.administrator.moderationActions.create(
      connection,
      {
        body: {
          report_id: fakeReportId,
          action_type: "remove_post",
          result: "content_removed",
          status: "completed",
        },
      },
    );
  typia.assert(moderationAction);
  // 5. Switch to moderator
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://test.moderator.login",
      referrer: "https://test.homepage",
      ip: null,
    },
  });
  // 6. Create moderator-specific action
  const moderatorMemo = RandomGenerator.paragraph({ sentences: 2 });
  const moderatorAction =
    await api.functional.communityPlatform.moderator.moderationActions.moderatorAction.create(
      connection,
      {
        moderationActionId: moderationAction.id,
        body: {
          memo: moderatorMemo,
        },
      },
    );
  typia.assert(moderatorAction);
  // 7. Switch back to administrator
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://test.admin.relogin",
      referrer: "https://test.homepage",
      ip: null,
    },
  });
  // 8. Retrieve moderator action details as administrator
  const fetchedModeratorAction =
    await api.functional.communityPlatform.administrator.moderationActions.moderatorAction.at(
      connection,
      {
        moderationActionId: moderationAction.id,
      },
    );
  typia.assert(fetchedModeratorAction);
  // 9. Validate fields: moderator, session, memo, id/linkage, audit
  TestValidator.equals(
    "moderator action id matches",
    fetchedModeratorAction.id,
    moderatorAction.id,
  );
  TestValidator.equals(
    "parent moderation action linkage",
    fetchedModeratorAction.moderation_action_id,
    moderationAction.id,
  );
  TestValidator.equals(
    "memo field is correct",
    fetchedModeratorAction.memo,
    moderatorMemo,
  );
  // moderator identity match
  TestValidator.equals(
    "moderator reference matches",
    fetchedModeratorAction.moderator.id,
    moderatorCreation.id,
  );
  // moderator session structure (just type assertion on ISummary)
  typia.assert<ICommunityPlatformModeratorSession.ISummary>(
    fetchedModeratorAction.moderator_session,
  );
  // created_at audit field
  TestValidator.predicate(
    "created_at field exists and is string",
    typeof fetchedModeratorAction.created_at === "string" &&
      fetchedModeratorAction.created_at.length > 0,
  );
}
