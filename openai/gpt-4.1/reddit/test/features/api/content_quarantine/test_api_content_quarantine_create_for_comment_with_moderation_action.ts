import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformContentQuarantine } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformContentQuarantine";

/**
 * Validate administrator ability to create a content quarantine for a comment,
 * referencing a moderation action.
 *
 * This test ensures that an authenticated administrator can submit a valid
 * quarantine creation request for a specific comment with a provided moderation
 * action reference. The flow simulates a realistic moderation case, focusing on
 * required fields and relationship integrity.
 *
 * Step-by-step process:
 *
 * 1. Register a new administrator and obtain authorization context.
 * 2. Generate random UUIDs to serve as the comment and moderation action
 *    references (since upstream creation is not in-scope).
 * 3. Prepare a valid quarantine creation request, populating required properties:
 *    quarantine_type, status, start_at, target_comment_id, and
 *    moderation_action_id. Omit unrelated fields (target_post_id,
 *    target_community_id, end_at).
 * 4. Execute the quarantine creation API using administrator auth context.
 * 5. Assert that response is a valid quarantine entity with matching referenced
 *    comment and moderation action IDs.
 */
export async function test_api_content_quarantine_create_for_comment_with_moderation_action(
  connection: api.IConnection,
) {
  // 1. Register a new administrator for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const adminAuthorized: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(adminAuthorized);

  // 2. Generate references for comment and moderation action (simulate foreign entities)
  const target_comment_id = typia.random<string & tags.Format<"uuid">>();
  const moderation_action_id = typia.random<string & tags.Format<"uuid">>();

  // 3. Prepare request body for quarantine creation
  const quarantineCreate = {
    quarantine_type: "spam", // Example allowed value
    status: "active", // Example allowed value
    start_at: new Date().toISOString(),
    target_comment_id,
    moderation_action_id,
  } satisfies ICommunityPlatformContentQuarantine.ICreate;

  // 4. Execute content quarantine creation as administrator
  const quarantine: ICommunityPlatformContentQuarantine =
    await api.functional.communityPlatform.administrator.contentQuarantines.create(
      connection,
      {
        body: quarantineCreate,
      },
    );
  typia.assert(quarantine);

  // 5. Assert correct association between quarantine, comment, and moderation action
  TestValidator.equals(
    "comment quarantine links correct comment",
    quarantine.target_comment_id,
    target_comment_id,
  );
  TestValidator.equals(
    "quarantine references correct moderation action",
    quarantine.moderation_action_id,
    moderation_action_id,
  );
  TestValidator.equals(
    "quarantine_type is correct",
    quarantine.quarantine_type,
    "spam",
  );
  TestValidator.equals("status is set to active", quarantine.status, "active");
}
