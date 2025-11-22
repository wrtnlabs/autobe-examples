import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditPlatformModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAppeal";
import type { IRedditPlatformPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPlatformAdministrator";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";

/**
 * Test appeal retrieval workflow for administrators to review appeals with
 * additional evidence.
 *
 * This E2E test validates the complete appeal review process where platform
 * administrators retrieve appeals containing supporting evidence, review
 * context, and decision-making information. The test includes appeal creation
 * with evidence, administrator authentication, and detailed appeal retrieval
 * with emphasis on evidence examination and comprehensive appeal metadata
 * review.
 *
 * **Test Workflow:**
 *
 * 1. Create platform administrator account with proper system permissions
 * 2. Generate appeal ID for retrieval testing
 * 3. Retrieve appeal using the target endpoint
 * 4. Validate complete appeal structure including evidence, review notes, and
 *    metadata
 */
export async function test_api_appeal_retrieval_with_evidence_review(
  connection: api.IConnection,
) {
  // Step 1: Create platform administrator account for evidence review testing
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IRedditPlatformPlatformAdministrator.IAuthorized =
    await api.functional.auth.platformAdministrator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: adminEmail,
        password: "AdminPassword123!",
        display_name: "Platform Administrator",
        administrator_level: "admin",
        system_permissions: JSON.stringify({
          content_moderation: {
            can_manage_reports: true,
            can_view_hidden_content: true,
            can_remove_content: true,
          },
          compliance_legal: {
            can_access_compliance_data: true,
            can_manage_legal_requests: true,
          },
        }),
        security_clearance: "high",
      } satisfies IRedditPlatformPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Generate appeal ID for retrieval testing
  const appealId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 3: Retrieve appeal using the target endpoint
  const retrievedAppeal: IRedditPlatformModerationAppeal =
    await api.functional.redditPlatform.platformAdministrator.appeals.at(
      connection,
      {
        appealId: appealId,
      },
    );
  typia.assert(retrievedAppeal);

  // Step 4: Validate complete appeal structure and metadata
  TestValidator.equals(
    "retrieved appeal ID matches requested ID",
    retrievedAppeal.id,
    appealId,
  );
  TestValidator.predicate(
    "appeal status is valid",
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
    "appeal level is valid",
    ["initial", "secondary", "final"].includes(retrievedAppeal.appeal_level),
  );
  TestValidator.predicate(
    "appeal has valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      retrievedAppeal.id,
    ),
  );
  TestValidator.predicate(
    "retrieved appeal has required fields",
    retrievedAppeal.appeal_reason !== undefined &&
      retrievedAppeal.created_at !== undefined &&
      retrievedAppeal.updated_at !== undefined,
  );

  // Step 5: Validate timestamps are in proper date-time format
  TestValidator.predicate(
    "created_at timestamp is valid ISO format",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T[01][0-9]:[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/.test(
      retrievedAppeal.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at timestamp is valid ISO format",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T[01][0-9]:[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/.test(
      retrievedAppeal.updated_at,
    ),
  );

  // Step 6: Validate moderation action reference is proper UUID
  TestValidator.predicate(
    "moderation action ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      retrievedAppeal.moderation_action_id,
    ),
  );

  // Step 7: Validate escalation logic consistency
  if (retrievedAppeal.appeal_level === "final") {
    TestValidator.predicate(
      "final appeals should be escalated",
      retrievedAppeal.is_escalated === true,
    );
  } else {
    TestValidator.predicate(
      "non-final appeals have appropriate escalation status",
      typeof retrievedAppeal.is_escalated === "boolean",
    );
  }

  // Step 8: Validate optional fields structure when present
  if (retrievedAppeal.additional_evidence !== undefined) {
    TestValidator.predicate(
      "additional evidence is non-empty string",
      typeof retrievedAppeal.additional_evidence === "string" &&
        retrievedAppeal.additional_evidence.length > 0,
    );
  }

  if (retrievedAppeal.review_notes !== undefined) {
    TestValidator.predicate(
      "review notes is non-empty string",
      typeof retrievedAppeal.review_notes === "string" &&
        retrievedAppeal.review_notes.length > 0,
    );
  }

  if (retrievedAppeal.decision_reason !== undefined) {
    TestValidator.predicate(
      "decision reason is non-empty string",
      typeof retrievedAppeal.decision_reason === "string" &&
        retrievedAppeal.decision_reason.length > 0,
    );
  }

  // Step 9: Validate resolved timestamp consistency
  if (
    retrievedAppeal.status === "approved" ||
    retrievedAppeal.status === "denied" ||
    retrievedAppeal.status === "withdrawn"
  ) {
    TestValidator.predicate(
      "resolved appeals have resolved_at timestamp",
      retrievedAppeal.resolved_at !== undefined,
    );
    if (retrievedAppeal.resolved_at !== undefined) {
      TestValidator.predicate(
        "resolved_at timestamp is valid ISO format",
        /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T[01][0-9]:[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/.test(
          retrievedAppeal.resolved_at,
        ),
      );
    }
  } else {
    TestValidator.predicate(
      "unresolved appeals do not have resolved_at timestamp",
      retrievedAppeal.resolved_at === undefined,
    );
  }
}
