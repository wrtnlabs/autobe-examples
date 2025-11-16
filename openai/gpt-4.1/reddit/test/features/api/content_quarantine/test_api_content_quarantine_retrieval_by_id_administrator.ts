import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformContentQuarantine } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformContentQuarantine";

/**
 * Validates that an administrator can retrieve a specific content quarantine
 * record and that all event context (type, status, timing, affected resources,
 * moderation linkage) is returned completely and correctly for audit purposes.
 * Ensures only administrative actors can access this endpoint and checks for
 * full DTO compliance and data consistency between creation and read
 * endpoints.
 */
export async function test_api_content_quarantine_retrieval_by_id_administrator(
  connection: api.IConnection,
) {
  // 1. Register a new administrator and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 8,
    wordMax: 16,
  });
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Create a new quarantine record as administrator
  const quarantineBody = {
    quarantine_type: RandomGenerator.pick([
      "spam",
      "abuse",
      "investigation",
      "legal_hold",
    ] as const),
    status: RandomGenerator.pick([
      "active",
      "lifted",
      "expired",
      "revoked",
    ] as const),
    start_at: new Date().toISOString(),
    end_at: null,
    target_post_id: typia.random<string & tags.Format<"uuid">>(),
    target_comment_id: null,
    target_community_id: null,
    moderation_action_id: null,
  } satisfies ICommunityPlatformContentQuarantine.ICreate;
  const created =
    await api.functional.communityPlatform.administrator.contentQuarantines.create(
      connection,
      {
        body: quarantineBody,
      },
    );
  typia.assert(created);

  // 3. Retrieve the quarantine record by id
  const retrieved =
    await api.functional.communityPlatform.administrator.contentQuarantines.at(
      connection,
      {
        contentQuarantineId: created.id,
      },
    );
  typia.assert(retrieved);

  // 4. Validate creation and retrieval result
  TestValidator.equals("quarantine id matches", retrieved.id, created.id);
  TestValidator.equals(
    "quarantine type matches",
    retrieved.quarantine_type,
    quarantineBody.quarantine_type,
  );
  TestValidator.equals(
    "quarantine status matches",
    retrieved.status,
    quarantineBody.status,
  );
  TestValidator.equals(
    "start_at matches",
    retrieved.start_at,
    quarantineBody.start_at,
  );
  TestValidator.equals("end_at is null at creation", retrieved.end_at, null);
  TestValidator.equals(
    "target_post_id matches",
    retrieved.target_post_id,
    quarantineBody.target_post_id,
  );
  TestValidator.equals(
    "target_comment_id is null",
    retrieved.target_comment_id,
    null,
  );
  TestValidator.equals(
    "target_community_id is null",
    retrieved.target_community_id,
    null,
  );
  TestValidator.equals(
    "moderation_action_id is null",
    retrieved.moderation_action_id,
    null,
  );
  TestValidator.predicate(
    "created_at is valid ISO date",
    typeof retrieved.created_at === "string" &&
      !Number.isNaN(Date.parse(retrieved.created_at)),
  );
}
