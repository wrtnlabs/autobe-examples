import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackGuest";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test the primary workflow of listing guest invitations for administrative review.
 *
 * Validates the complete guest invitation listing flow including pagination, data structure verification, and sorting behavior. Ensures that guest invitations are correctly retrieved with all required fields and that soft-deleted invitations are excluded from results.
 *
 * Special attention is given to verifying pagination metadata accuracy, nested organization and role data presence, and correct sorting by creation date in descending order.
 *
 * 1. Call PATCH /hrmTimeTrack/guests with empty request body to retrieve all guest invitations
 * 2. Verify response contains paginated results with pagination metadata (current page, limit, total records, total pages)
 * 3. Verify each guest invitation in the data array contains: id, email, status, expires_at, created_at, deleted_at, organization (with id, name), and role (with id, name)
 * 4. Verify results are sorted by created_at descending (newest invitations first)
 * 5. Verify soft-deleted invitations (deleted_at IS NOT NULL) are excluded from results
 * 6. Test pagination by requesting page 2 and verifying different results are returned
 * 7. Verify the endpoint is accessible without authentication (public endpoint)
 */
export async function test_api_guest_list_pending_invitations(
  connection: api.IConnection,
): Promise<void> {
  // 1. Call PATCH /hrmTimeTrack/guests with empty request body
  const page1 = await api.functional.hrmTimeTrack.guests.index(connection, {
    body: {} satisfies IHrmTimeTrackGuest.IRequest,
  });
  typia.assert(page1);
  // 2. Verify response contains paginated results with pagination metadata
  TestValidator.predicate(
    "pagination metadata exists",
    page1.pagination.current >= 1 &&
      page1.pagination.limit > 0 &&
      page1.pagination.records >= 0 &&
      page1.pagination.pages >= 0,
  );
  // 3. Verify each guest invitation contains required fields
  for (const guest of page1.data) {
    // Verify guest invitation fields
    TestValidator.predicate(
      `guest ${guest.id} has valid UUID`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        guest.id,
      ),
    );
    TestValidator.predicate(
      `guest ${guest.id} has email`,
      guest.email.length > 0,
    );
    TestValidator.predicate(
      `guest ${guest.id} has status`,
      ["pending", "accepted", "expired"].includes(guest.status),
    );
    TestValidator.predicate(
      `guest ${guest.id} has expires_at`,
      guest.expires_at.length > 0,
    );
    TestValidator.predicate(
      `guest ${guest.id} has created_at`,
      guest.created_at.length > 0,
    );
    // Verify soft-deleted invitations are excluded (deleted_at should be null)
    TestValidator.equals(
      `guest ${guest.id} is not soft-deleted`,
      guest.deleted_at,
      null,
    );
    // Verify organization data
    TestValidator.predicate(
      `guest ${guest.id} has organization`,
      guest.organization.id.length > 0 && guest.organization.name.length > 0,
    );
    // Verify role data
    TestValidator.predicate(
      `guest ${guest.id} has role`,
      guest.role.id.length > 0 && guest.role.name.length > 0,
    );
  }
  // 4. Verify results are sorted by created_at descending (newest first)
  if (page1.data.length > 1) {
    for (let i = 1; i < page1.data.length; i++) {
      TestValidator.predicate(
        `guests sorted by created_at descending`,
        new Date(page1.data[i - 1].created_at).getTime() >=
          new Date(page1.data[i].created_at).getTime(),
      );
    }
  }
  // 6. Test pagination by requesting page 2
  const page2 = await api.functional.hrmTimeTrack.guests.index(connection, {
    body: {
      page: 2,
    } satisfies IHrmTimeTrackGuest.IRequest,
  });
  typia.assert(page2);
  // Verify page 2 has correct pagination metadata
  TestValidator.equals(
    "page 2 current page number",
    page2.pagination.current,
    2,
  );
  // Verify different results on page 2 (if data exists)
  if (page1.data.length > 0 && page2.data.length > 0) {
    const page1Ids = page1.data.map((g) => g.id);
    const page2Ids = page2.data.map((g) => g.id);
    const hasOverlap = page2Ids.some((id) => page1Ids.includes(id));
    TestValidator.predicate(
      "page 2 contains different invitations than page 1",
      !hasOverlap,
    );
  }
  // Test with status filter
  const pendingGuests = await api.functional.hrmTimeTrack.guests.index(
    connection,
    {
      body: {
        status: "pending",
      } satisfies IHrmTimeTrackGuest.IRequest,
    },
  );
  typia.assert(pendingGuests);
  // Verify all returned guests have pending status
  for (const guest of pendingGuests.data) {
    TestValidator.equals(
      `filtered guest ${guest.id} has pending status`,
      guest.status,
      "pending",
    );
  }
  // Test with search filter
  if (page1.data.length > 0) {
    const sampleEmail = page1.data[0].email;
    const searchResults = await api.functional.hrmTimeTrack.guests.index(
      connection,
      {
        body: {
          search: sampleEmail,
        } satisfies IHrmTimeTrackGuest.IRequest,
      },
    );
    typia.assert(searchResults);
    // Verify all returned guests match the search term
    for (const guest of searchResults.data) {
      TestValidator.predicate(
        `search result guest ${guest.id} matches search term`,
        guest.email.toLowerCase().includes(sampleEmail.toLowerCase()),
      );
    }
  }
}
