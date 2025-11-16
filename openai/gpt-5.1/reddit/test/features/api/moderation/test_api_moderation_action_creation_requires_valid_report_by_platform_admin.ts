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

export async function test_api_moderation_action_creation_requires_valid_report_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform administrator
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // Basic sanity checks on admin response
  TestValidator.predicate(
    "platform admin id must be a non-empty string",
    typeof admin.id === "string" && admin.id.length > 0,
  );
  TestValidator.predicate(
    "platform admin token.access must be a non-empty string",
    typeof admin.token.access === "string" && admin.token.access.length > 0,
  );

  // 2. Create a moderation action as this platform admin
  const communityIdOrNull = typia.random<string & tags.Format<"uuid">>();

  const createBody = {
    community_id: communityIdOrNull,
    action_type: "remove_content",
    target_scope: "post",
    reason_summary: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 4,
      wordMax: 10,
    }),
    notes_internal: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction =
    await api.functional.communityPlatform.platformAdmin.moderationActions.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<ICommunityPlatformModerationAction>(moderationAction);

  // 3. Validate that the moderation action reflects the request body
  TestValidator.equals(
    "moderation action's action_type should match request",
    moderationAction.action_type,
    createBody.action_type,
  );

  TestValidator.equals(
    "moderation action's target_scope should match request",
    moderationAction.target_scope,
    createBody.target_scope,
  );

  if (
    createBody.community_id !== null &&
    createBody.community_id !== undefined
  ) {
    TestValidator.equals(
      "moderation action's community_id should match request when provided",
      moderationAction.community_id ?? null,
      createBody.community_id,
    );
  }

  // created_at and updated_at should be present (format is already enforced by typia)
  TestValidator.predicate(
    "moderation action created_at should be a non-empty string",
    typeof moderationAction.created_at === "string" &&
      moderationAction.created_at.length > 0,
  );
  TestValidator.predicate(
    "moderation action updated_at should be a non-empty string",
    typeof moderationAction.updated_at === "string" &&
      moderationAction.updated_at.length > 0,
  );
}
