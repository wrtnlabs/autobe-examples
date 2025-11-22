import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAppeal";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";

export async function test_api_appeal_retrieval_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create community moderator account with proper authentication
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorAccount: IRedditPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        registered_user_id: typia.random<string & tags.Format<"uuid">>(),
        moderation_permissions: JSON.stringify({
          can_remove_posts: true,
          can_remove_comments: true,
          can_ban_users: true,
          can_warn_users: true,
          can_pin_posts: false,
          can_edit_rules: false,
          can_manage_moderators: false,
          can_approve_posts: true,
        }),
        assigned_communities: JSON.stringify([
          typia.random<string & tags.Format<"uuid">>(),
        ]),
        appointed_by: typia.random<string & tags.Format<"uuid">>(),
        moderation_count: 0,
        last_moderation_action: new Date().toISOString(),
        active_status: "active",
        appointed_at: new Date().toISOString(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } satisfies IRedditPlatformCommunityModerator.ICreate,
    });
  typia.assert(moderatorAccount);

  // Step 2: Generate random appeal ID for retrieval test
  const appealId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 3: Retrieve appeal details using moderator account
  const retrievedAppeal: IRedditPlatformModerationAppeal =
    await api.functional.redditPlatform.communityModerator.appeals.at(
      connection,
      {
        appealId: appealId,
      },
    );
  typia.assert(retrievedAppeal);

  // Step 4: Validate appeal response contains required fields
  TestValidator.equals(
    "appeal ID matches request",
    retrievedAppeal.id,
    appealId,
  );
  TestValidator.predicate(
    "appeal has valid status",
    [
      "pending",
      "under_review",
      "approved",
      "denied",
      "escalated",
      "withdrawn",
    ].includes(retrievedAppeal.status),
  );
  TestValidator.predicate(
    "appeal has valid appeal level",
    ["initial", "secondary", "final"].includes(retrievedAppeal.appeal_level),
  );
  TestValidator.predicate(
    "is_escalated is boolean",
    typeof retrievedAppeal.is_escalated === "boolean",
  );
  TestValidator.predicate(
    "created_at is valid ISO date",
    typeof retrievedAppeal.created_at === "string" &&
      !isNaN(Date.parse(retrievedAppeal.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO date",
    typeof retrievedAppeal.updated_at === "string" &&
      !isNaN(Date.parse(retrievedAppeal.updated_at)),
  );

  // Step 5: Validate moderation context is properly included
  TestValidator.predicate(
    "appeal reason is present",
    typeof retrievedAppeal.appeal_reason === "string",
  );
  TestValidator.predicate(
    "moderation action ID is UUID format",
    typeof retrievedAppeal.moderation_action_id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        retrievedAppeal.moderation_action_id,
      ),
  );
  TestValidator.predicate(
    "appellant session ID is UUID format",
    typeof retrievedAppeal.appellant_session_id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        retrievedAppeal.appellant_session_id,
      ),
  );

  // Step 6: Verify moderator authentication was successful
  TestValidator.equals(
    "moderator account active status",
    moderatorAccount.moderator.active_status,
    "active",
  );
  TestValidator.predicate(
    "moderator has proper permissions",
    typeof moderatorAccount.moderator.moderation_permissions === "object",
  );
  TestValidator.equals(
    "authentication token present",
    !!moderatorAccount.token.access,
    true,
  );
}
