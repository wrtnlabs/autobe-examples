import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformContentQuarantine } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformContentQuarantine";

/**
 * Validate minimal quarantine creation by administrator for a post
 *
 * This flow tests that an administrator can register, authenticate, and create
 * a new content quarantine record on a post with minimal required data. It
 * verifies:
 *
 * - Admin registration/authentication yields a valid account context
 * - Quarantine creation with only required fields (type, status, start_at,
 *   target_post_id)
 * - Success response contains correct associations and audit fields
 */
export async function test_api_content_quarantine_create_minimal_for_post(
  connection: api.IConnection,
) {
  // 1. Register administrator and get authorized context
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = typia.random<
    string & tags.Format<"password">
  >();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);
  TestValidator.equals("administrator email matches", admin.email, adminEmail);
  TestValidator.equals("administrator has valid id", typeof admin.id, "string");
  TestValidator.predicate("status not empty", admin.status.length > 0);
  TestValidator.predicate(
    "created_at is ISO date",
    typeof admin.created_at === "string" && admin.created_at.includes("T"),
  );
  TestValidator.predicate("has token", typeof admin.token.access === "string");

  // 2. Post quarantine creation with only minimal/required fields for a post
  const quarantineType = RandomGenerator.pick([
    "spam",
    "abuse",
    "investigation",
    "legal_hold",
    "other",
  ] as const);
  const status = RandomGenerator.pick([
    "active",
    "lifted",
    "expired",
    "revoked",
  ] as const);
  // Simulate a minimal valid post ID to quarantine
  const postId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const startAt: string & tags.Format<"date-time"> = new Date().toISOString();

  const requestBody = {
    quarantine_type: quarantineType,
    status,
    start_at: startAt,
    target_post_id: postId,
  } satisfies ICommunityPlatformContentQuarantine.ICreate;

  const quarantine: ICommunityPlatformContentQuarantine =
    await api.functional.communityPlatform.administrator.contentQuarantines.create(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert(quarantine);

  // Validate audit/compliance fields and associations
  TestValidator.equals(
    "quarantine_type matches",
    quarantine.quarantine_type,
    quarantineType,
  );
  TestValidator.equals("status matches", quarantine.status, status);
  TestValidator.equals("start_at matches", quarantine.start_at, startAt);
  TestValidator.equals(
    "target_post_id matches",
    quarantine.target_post_id,
    postId,
  );
  TestValidator.equals(
    "target_comment_id is null or undefined",
    quarantine.target_comment_id,
    null,
  );
  TestValidator.equals(
    "target_community_id is null or undefined",
    quarantine.target_community_id,
    null,
  );
  TestValidator.predicate(
    "has id",
    typeof quarantine.id === "string" && quarantine.id.length > 0,
  );
  TestValidator.predicate(
    "created_at is ISO date",
    typeof quarantine.created_at === "string" &&
      quarantine.created_at.includes("T"),
  );
  TestValidator.predicate(
    "no unexpected end_at or moderation_action_id",
    (quarantine.end_at === undefined || quarantine.end_at === null) &&
      (quarantine.moderation_action_id === undefined ||
        quarantine.moderation_action_id === null),
  );
}
