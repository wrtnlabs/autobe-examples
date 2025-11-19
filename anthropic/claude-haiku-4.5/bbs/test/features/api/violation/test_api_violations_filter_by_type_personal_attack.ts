import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContentViolationRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentViolationRecord";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardContentViolationRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentViolationRecord";

/**
 * Test filtering violation records by personal attack violations.
 *
 * Moderator authenticates and requests violations filtered by
 * violation_type='personal_attack'. The system returns only violations where
 * users attacked individuals rather than topics. Validates all returned records
 * have violation_type='personal_attack'. This supports moderation analysis of
 * interpersonal conduct violations.
 *
 * Test workflow:
 *
 * 1. Create a new moderator account via POST /auth/moderator/join
 * 2. Request violation records filtered by violation_type='personal_attack'
 * 3. Validate pagination information is present
 * 4. Verify all returned violation records have violation_type='personal_attack'
 * 5. Ensure each violation record contains all required fields
 */
export async function test_api_violations_filter_by_type_personal_attack(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "SecureP@ssw0rd123",
        username: RandomGenerator.alphaNumeric(8),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  TestValidator.predicate(
    "moderator should be created with email verified false",
    !moderator.email_verified,
  );
  TestValidator.predicate(
    "moderator should have full moderation tier",
    moderator.moderation_tier === "full",
  );

  // Step 2: Request violation records filtered by personal_attack
  const violationPage: IPageIDiscussionBoardContentViolationRecord.ISummary =
    await api.functional.discussionBoard.moderator.moderation.violations.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          violation_type: "personal_attack",
        } satisfies IDiscussionBoardContentViolationRecord.IRequest,
      },
    );
  typia.assert(violationPage);

  // Step 3: Validate pagination information
  TestValidator.predicate(
    "pagination should have current page of 1",
    violationPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination should have limit of 20",
    violationPage.pagination.limit === 20,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    violationPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    violationPage.pagination.pages >= 0,
  );

  // Step 4: Verify all returned violations have violation_type='personal_attack'
  if (violationPage.data.length > 0) {
    for (const violation of violationPage.data) {
      TestValidator.predicate(
        `violation ${violation.id} should have type personal_attack`,
        violation.violation_type === "personal_attack",
      );
    }
  }

  // Step 5: Validate structure of violation records
  for (const violation of violationPage.data) {
    TestValidator.predicate(
      `violation should have id`,
      !!violation.id && violation.id.length > 0,
    );
    TestValidator.predicate(
      `violation should have violation_type`,
      !!violation.violation_type,
    );
    TestValidator.predicate(
      `violation should have severity`,
      !!violation.severity,
    );
    TestValidator.predicate(
      `violation should have violation_description`,
      !!violation.violation_description,
    );
    TestValidator.predicate(
      `violation should have action_taken`,
      !!violation.action_taken,
    );
    TestValidator.predicate(
      `violation should have detected_at`,
      !!violation.detected_at,
    );
    TestValidator.predicate(
      `violation should have contributor`,
      !!violation.contributor && !!violation.contributor.id,
    );
    TestValidator.predicate(
      `violation should have moderator`,
      !!violation.moderator && !!violation.moderator.id,
    );
    TestValidator.predicate(
      `violation should have created_at`,
      !!violation.created_at,
    );
  }

  // Additional test: Request with pagination
  const secondPage: IPageIDiscussionBoardContentViolationRecord.ISummary =
    await api.functional.discussionBoard.moderator.moderation.violations.index(
      connection,
      {
        body: {
          page: 2,
          limit: 10,
          violation_type: "personal_attack",
        } satisfies IDiscussionBoardContentViolationRecord.IRequest,
      },
    );
  typia.assert(secondPage);

  TestValidator.predicate(
    "second page should have current page of 2",
    secondPage.pagination.current === 2,
  );
  TestValidator.predicate(
    "second page should have limit of 10",
    secondPage.pagination.limit === 10,
  );
}
