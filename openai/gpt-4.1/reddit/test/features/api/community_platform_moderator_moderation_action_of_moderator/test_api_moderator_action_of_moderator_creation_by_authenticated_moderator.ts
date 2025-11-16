import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerationActionOfModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationActionOfModerator";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModeratorSession";

/**
 * Validates creation of a moderator-specific moderation action as an
 * authenticated moderator.
 *
 * Workflow:
 *
 * 1. Register (join) as a new platform moderator, gaining an authenticated
 *    session.
 * 2. Attempt to create a moderator-specific moderation action against a random
 *    moderationActionId (UUID), providing both a random explanatory string memo
 *    and null for memo (test both memo states).
 * 3. Validate that the response includes the moderator and session summary
 *    references, correct parent moderation_action_id, and that the memo
 *    property echoes the submitted value (string or null).
 * 4. Validate referential integrity by ensuring that the moderation_action_id
 *    property equals the one provided in the request.
 * 5. Validate authentication (operation only works as an authenticated moderator).
 * 6. Business rule: only one moderator action per moderation action (uniqueness
 *    constraint can be checked elsewhere).
 * 7. Validate that the output matches the
 *    ICommunityPlatformModerationActionOfModerator schema.
 */
export async function test_api_moderator_action_of_moderator_creation_by_authenticated_moderator(
  connection: api.IConnection,
) {
  // 1. Register (join) as moderator
  const moderatorJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    status: "active",
    business_status: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies ICommunityPlatformModerator.ICreate;
  const moderatorAuth = await api.functional.auth.moderator.join(connection, {
    body: moderatorJoinBody,
  });
  typia.assert(moderatorAuth);
  TestValidator.equals(
    "credentials: email echo",
    moderatorAuth.email,
    moderatorJoinBody.email,
  );
  TestValidator.equals("credentials: status", moderatorAuth.status, "active");
  TestValidator.equals(
    "credentials: business_status is null",
    moderatorAuth.business_status,
    null,
  );
  TestValidator.predicate(
    "token is string",
    typeof moderatorAuth.token.access === "string",
  );

  // 2. Attempt creation with an arbitrary moderationActionId (random uuid) - with memo (string)
  const moderationActionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const memoValue = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 14,
  });

  const createWithMemo =
    await api.functional.communityPlatform.moderator.moderationActions.moderatorAction.create(
      connection,
      {
        moderationActionId,
        body: {
          memo: memoValue,
        } satisfies ICommunityPlatformModerationActionOfModerator.ICreate,
      },
    );
  typia.assert(createWithMemo);
  TestValidator.equals(
    "moderation_action_id is correct",
    createWithMemo.moderation_action_id,
    moderationActionId,
  );
  TestValidator.equals("memo: string value", createWithMemo.memo, memoValue);
  TestValidator.predicate(
    "moderator ref exists",
    typeof createWithMemo.moderator.id === "string",
  );
  TestValidator.predicate(
    "moderator_session ref exists",
    typeof createWithMemo.moderator_session.id === "string",
  );
  TestValidator.predicate(
    "created_at is ISO string",
    typeof createWithMemo.created_at === "string",
  );

  // 3. Attempt creation with explicit null memo
  const moderationActionId2: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const createWithNullMemo =
    await api.functional.communityPlatform.moderator.moderationActions.moderatorAction.create(
      connection,
      {
        moderationActionId: moderationActionId2,
        body: {
          memo: null,
        } satisfies ICommunityPlatformModerationActionOfModerator.ICreate,
      },
    );
  typia.assert(createWithNullMemo);
  TestValidator.equals(
    "moderation_action_id is correct (null memo)",
    createWithNullMemo.moderation_action_id,
    moderationActionId2,
  );
  TestValidator.equals("memo: null value", createWithNullMemo.memo, null);
  TestValidator.predicate(
    "moderator ref exists (null memo)",
    typeof createWithNullMemo.moderator.id === "string",
  );
  TestValidator.predicate(
    "moderator_session ref exists (null memo)",
    typeof createWithNullMemo.moderator_session.id === "string",
  );
  TestValidator.predicate(
    "created_at is ISO string (null memo)",
    typeof createWithNullMemo.created_at === "string",
  );
}
