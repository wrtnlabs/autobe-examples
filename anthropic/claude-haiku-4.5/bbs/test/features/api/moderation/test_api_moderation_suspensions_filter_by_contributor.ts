import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSuspension";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserSuspension";

/**
 * Test filtering suspension records by specific contributor ID.
 *
 * A moderator authenticates and retrieves suspension records with filtering by
 * contributor ID. Validates that the suspension filtering API correctly returns
 * records with proper structure, pagination, and field validation. Tests
 * various filter combinations to ensure the API properly processes
 * contributor_id filters along with status and type filters.
 *
 * Test flow:
 *
 * 1. Moderator registration and authentication
 * 2. Query suspensions with contributor_id filter
 * 3. Validate response structure and pagination
 * 4. Verify suspension record structure and fields
 * 5. Test filtering combinations (status, type, contributor_id)
 * 6. Validate data integrity and field values
 */
export async function test_api_moderation_suspensions_filter_by_contributor(
  connection: api.IConnection,
) {
  // 1. Moderator registers and authenticates
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePass123!";
  const moderatorUsername = RandomGenerator.alphabets(10);

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: moderatorUsername,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  TestValidator.predicate(
    "moderator should be authenticated with valid token",
    moderator.id !== undefined && moderator.token !== undefined,
  );

  // 2. Test suspension filtering by contributor_id
  const targetContributorId = typia.random<string & tags.Format<"uuid">>();

  const suspensionResponse: IPageIDiscussionBoardUserSuspension.ISummary =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: {
          contributor_id: targetContributorId,
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardUserSuspension.IRequest,
      },
    );
  typia.assert(suspensionResponse);

  // 3. Validate response structure
  TestValidator.predicate(
    "response should have pagination object",
    suspensionResponse.pagination !== undefined,
  );

  TestValidator.predicate(
    "pagination should have valid structure",
    typeof suspensionResponse.pagination.current === "number" &&
      typeof suspensionResponse.pagination.limit === "number" &&
      typeof suspensionResponse.pagination.records === "number" &&
      typeof suspensionResponse.pagination.pages === "number" &&
      suspensionResponse.pagination.current >= 0 &&
      suspensionResponse.pagination.limit > 0 &&
      suspensionResponse.pagination.records >= 0 &&
      suspensionResponse.pagination.pages >= 0,
  );

  TestValidator.predicate(
    "response should have data array",
    Array.isArray(suspensionResponse.data),
  );

  // 4. Validate suspension record structure
  if (suspensionResponse.data.length > 0) {
    for (const suspension of suspensionResponse.data) {
      TestValidator.predicate(
        "suspension should have id",
        typeof suspension.id === "string" && suspension.id.length > 0,
      );

      TestValidator.predicate(
        "suspension should have moderator info",
        suspension.moderator !== undefined &&
          typeof suspension.moderator.id === "string" &&
          typeof suspension.moderator.username === "string",
      );

      const validTypes: (
        | "posting_restriction"
        | "account_suspension"
        | "permanent_ban"
      )[] = ["posting_restriction", "account_suspension", "permanent_ban"];
      TestValidator.predicate(
        "suspension_type should be valid",
        validTypes.includes(suspension.suspension_type),
      );

      TestValidator.predicate(
        "reason should be non-empty string",
        typeof suspension.reason === "string" && suspension.reason.length > 0,
      );

      const validSeverities: ("minor" | "moderate" | "severe" | "permanent")[] =
        ["minor", "moderate", "severe", "permanent"];
      TestValidator.predicate(
        "severity_level should be valid",
        validSeverities.includes(suspension.severity_level),
      );

      const validStatuses: ("active" | "lifted" | "expired")[] = [
        "active",
        "lifted",
        "expired",
      ];
      TestValidator.predicate(
        "status should be valid",
        validStatuses.includes(suspension.status),
      );

      TestValidator.predicate(
        "suspended_at should be ISO date-time",
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(suspension.suspended_at),
      );
    }
  }

  // 5. Test filtering with status parameter
  const filteredByStatus: IPageIDiscussionBoardUserSuspension.ISummary =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: {
          contributor_id: targetContributorId,
          status: "active",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardUserSuspension.IRequest,
      },
    );
  typia.assert(filteredByStatus);

  TestValidator.predicate(
    "filtered response should have data array",
    Array.isArray(filteredByStatus.data),
  );

  if (filteredByStatus.data.length > 0) {
    for (const suspension of filteredByStatus.data) {
      TestValidator.equals(
        "all suspensions should have active status when filtered",
        suspension.status,
        "active",
      );
    }
  }

  // 6. Test filtering with suspension_type parameter
  const filteredByType: IPageIDiscussionBoardUserSuspension.ISummary =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: {
          contributor_id: targetContributorId,
          suspension_type: "posting_restriction",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardUserSuspension.IRequest,
      },
    );
  typia.assert(filteredByType);

  TestValidator.predicate(
    "type-filtered response should have data array",
    Array.isArray(filteredByType.data),
  );

  if (filteredByType.data.length > 0) {
    for (const suspension of filteredByType.data) {
      TestValidator.equals(
        "all suspensions should be posting_restriction when filtered",
        suspension.suspension_type,
        "posting_restriction",
      );
    }
  }

  // 7. Test filtering with severity_level parameter
  const filteredBySeverity: IPageIDiscussionBoardUserSuspension.ISummary =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: {
          contributor_id: targetContributorId,
          severity_level: "severe",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardUserSuspension.IRequest,
      },
    );
  typia.assert(filteredBySeverity);

  if (filteredBySeverity.data.length > 0) {
    for (const suspension of filteredBySeverity.data) {
      TestValidator.equals(
        "all suspensions should have severe severity when filtered",
        suspension.severity_level,
        "severe",
      );
    }
  }

  // 8. Test pagination with different limits
  const page2Response: IPageIDiscussionBoardUserSuspension.ISummary =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: {
          contributor_id: targetContributorId,
          page: 2,
          limit: 10,
        } satisfies IDiscussionBoardUserSuspension.IRequest,
      },
    );
  typia.assert(page2Response);

  TestValidator.predicate(
    "pagination should reflect correct page",
    page2Response.pagination.current === 2,
  );

  TestValidator.predicate(
    "limit should be respected",
    page2Response.pagination.limit === 10,
  );
}
