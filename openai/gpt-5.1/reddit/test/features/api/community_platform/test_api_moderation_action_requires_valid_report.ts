import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";

export async function test_api_moderation_action_requires_valid_report(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a community moderator so that the
  //    Authorization header is automatically configured on the shared connection.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://community.example.com/moderator/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderator = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: joinBody,
    },
  );
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(moderator);

  // 2. Prepare a random reportId that should not correspond to any existing
  //    community_platform_reports row. We rely on UUID randomness for
  //    practical non-existence, knowing that the business contract says the
  //    server must reject non-existent report IDs.
  const nonExistentReportId = typia.random<string & tags.Format<"uuid">>();

  // 3. Build a syntactically valid moderation action creation payload.
  const moderationCreateBody = {
    community_id: typia.random<string & tags.Format<"uuid">>(),
    action_type: "remove_content",
    target_scope: "post",
    reason_summary: RandomGenerator.paragraph({ sentences: 3 }),
    notes_internal: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  // 4. Assert that attempting to create a moderation action for the
  //    non-existent reportId results in an error. We do not assert a
  //    particular HTTP status code, only that the call fails.
  await TestValidator.error(
    "creating moderation action must fail for non-existent reportId",
    async () => {
      await api.functional.communityPlatform.communityModerator.reports.moderationActions.create(
        connection,
        {
          reportId: nonExistentReportId,
          body: moderationCreateBody,
        },
      );
    },
  );
}
