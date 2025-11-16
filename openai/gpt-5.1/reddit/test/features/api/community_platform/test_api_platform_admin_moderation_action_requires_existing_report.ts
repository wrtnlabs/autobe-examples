import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

export async function test_api_platform_admin_moderation_action_requires_existing_report(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin so that privileged endpoints can be called
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.example.com/register",
    referrer: "https://admin.console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. Generate a random UUID to use as a non-existent reportId
  const missingReportId = typia.random<string & tags.Format<"uuid">>();

  // 3. Prepare a valid moderation action create payload
  const createBody = {
    action_type: "lock_content",
    target_scope: "post",
    reason_summary: RandomGenerator.paragraph({ sentences: 3 }),
    notes_internal: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  // 4. Attempt to create the moderation action and assert that it fails because the report does not exist
  await TestValidator.error(
    "creating moderation action for non-existent report must fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.reports.moderationActions.create(
        connection,
        {
          reportId: missingReportId,
          body: createBody,
        },
      );
    },
  );
}
