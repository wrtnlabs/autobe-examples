import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test the primary success path for guest users browsing the discussion board section list.
 * A guest user should be able to retrieve a paginated list of all active sections without
 * authentication barriers. The test verifies:
 * (1) Guest can successfully call the section listing endpoint with default parameters
 * (2) Response contains pagination metadata with correct structure
 * (3) Response data array contains section summaries with required fields
 * (4) Soft-deleted sections are excluded from results (deleted_at IS NULL)
 * (5) Creator information includes administrator display name and grade
 * (6) Default pagination returns reasonable page size within bounds
 */
export async function test_api_section_listing_guest_browsing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Establish guest session for authenticated guest browsing
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth: IDiscussionBoardGuest.IAuthorized =
    await authorize_guest_join(guestConnection, {
      body: {
        deviceFingerprint: RandomGenerator.alphaNumeric(32),
      } satisfies IDiscussionBoardGuest.IJoin,
    });
  typia.assert(guestAuth);
  // 2. Call section listing endpoint with default parameters
  const sections: IPageIDiscussionBoardSection.ISummary =
    await api.functional.discussionBoard.guest.sections.index(guestConnection, {
      body: {} satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(sections);
  // 3. Validate pagination metadata structure
  TestValidator.predicate(
    "pagination current page exists",
    sections.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit exists",
    sections.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination total records exists",
    sections.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination total pages exists",
    sections.pagination.pages >= 0,
  );
  // 4. Validate section summaries contain required fields
  for (const section of sections.data) {
    typia.assert(section);
    // Required field: id (UUID format)
    TestValidator.predicate(
      "section has valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        section.id,
      ),
    );
    // Required field: name
    TestValidator.predicate("section has name", section.name.length > 0);
    // Optional field: description (can be null or undefined)
    if (section.description !== null && section.description !== undefined) {
      TestValidator.predicate(
        "description is string",
        typeof section.description === "string",
      );
    }
    // Required field: creator info
    TestValidator.predicate(
      "creator has display name",
      section.creator.display_name.length > 0,
    );
    TestValidator.predicate(
      "creator has grade",
      section.creator.grade.length > 0,
    );
    // Required field: timestamps
    TestValidator.predicate(
      "created_at is valid date-time",
      !isNaN(Date.parse(section.created_at)),
    );
    TestValidator.predicate(
      "updated_at is valid date-time",
      !isNaN(Date.parse(section.updated_at)),
    );
    // 5. Verify soft-deleted sections are excluded (deleted_at IS NULL)
    TestValidator.equals(
      "active section has null deleted_at",
      section.deleted_at,
      null,
    );
  }
  // 6. Validate default pagination returns reasonable page size
  TestValidator.predicate(
    "default limit within bounds (1-100)",
    sections.pagination.limit === 0 ||
      (sections.pagination.limit >= 1 && sections.pagination.limit <= 100),
  );
}
