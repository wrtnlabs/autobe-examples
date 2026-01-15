import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformSalesOrderNote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSalesOrderNote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSalesOrderNote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSalesOrderNote";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_sales_order_notes_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate via join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    href: "https://example.com/join",
    referrer: "https://example.com",
    ip: null,
  } satisfies ICommunityPlatformAdmin.IJoin;
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: adminCredentials,
  });
  typia.assert(adminAuth);
  // Test 1: Basic retrieval - no filters (use empty note to match all)
  const allNotesResponse =
    await api.functional.communityPlatform.admin.salesordernotes.index(
      adminConnection,
      {
        body: {
          id: "", // Required by IRequest, empty string for no ID filtering
          note: "", // Empty note to match all notes
          created_at: "", // Empty created_at to match all dates
        } satisfies ICommunityPlatformSalesOrderNote.IRequest,
      },
    );
  typia.assert(allNotesResponse);
  // Validate pagination metadata structure
  TestValidator.equals(
    "pagination exists",
    allNotesResponse.pagination !== undefined,
    true,
  );
  TestValidator.predicate(
    "current page >= 0",
    allNotesResponse.pagination.current >= 0,
  );
  TestValidator.predicate("limit > 0", allNotesResponse.pagination.limit > 0);
  TestValidator.predicate(
    "records >= 0",
    allNotesResponse.pagination.records >= 0,
  );
  TestValidator.predicate("pages >= 0", allNotesResponse.pagination.pages >= 0);
  // Test 2: Keyword search on note content - use 'note' property
  const keyword = "Order";
  const keywordResponse =
    await api.functional.communityPlatform.admin.salesordernotes.index(
      adminConnection,
      {
        body: {
          id: "", // Empty ID for no filtering
          note: keyword, // Use 'note' for keyword search
          created_at: "", // Empty created_at for no date filtering
        } satisfies ICommunityPlatformSalesOrderNote.IRequest,
      },
    );
  typia.assert(keywordResponse);
  // Validate all returned notes contain the keyword
  const keywordNotes = keywordResponse.data;
  const allContainKeyword = keywordNotes.every(
    (note) =>
      note.content?.toLowerCase().includes(keyword.toLowerCase()) || false,
  );
  TestValidator.predicate("keyword search matches content", allContainKeyword);
  // Test 3: Date range filter on creation date - use 'created_at' property
  const today = new Date();
  const startDate = today.toISOString(); // Use current date as a filter
  const dateRangeResponse =
    await api.functional.communityPlatform.admin.salesordernotes.index(
      adminConnection,
      {
        body: {
          id: "", // Empty ID for no filtering
          note: "", // Empty note for no keyword filtering
          created_at: startDate, // Use 'created_at' for date filtering
        } satisfies ICommunityPlatformSalesOrderNote.IRequest,
      },
    );
  typia.assert(dateRangeResponse);
  // Validate all notes are from today or later (since we're filtering by exact date or later)
  const dateRangeNotes = dateRangeResponse.data;
  const isValidDateRange = dateRangeNotes.every((note) => {
    const noteDate = new Date(note.created).getTime();
    const start = new Date(startDate).getTime();
    return noteDate >= start; // Check if created date is >= the target date
  });
  TestValidator.predicate("date filter works", isValidDateRange);
  // Test 4: Pagination with limit - note: the API doesn't accept limit/page parameters
  // We'll test the response pagination by using a conservative approach
  // The server will handle pagination internally
  const paginatedResponse =
    await api.functional.communityPlatform.admin.salesordernotes.index(
      adminConnection,
      {
        body: {
          id: "",
          note: "",
          created_at: "",
        } satisfies ICommunityPlatformSalesOrderNote.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  // Validate pagination values
  TestValidator.equals(
    "pagination limit > 0",
    paginatedResponse.pagination.limit > 0,
    true,
  );
  TestValidator.equals(
    "pagination current >= 0",
    paginatedResponse.pagination.current >= 0,
    true,
  );
  TestValidator.predicate(
    "pagination records >= limit",
    paginatedResponse.pagination.records >= paginatedResponse.pagination.limit,
  );
  TestValidator.predicate(
    "pagination pages >= 1",
    paginatedResponse.pagination.pages >= 1,
  );
  // Test 5: Combined filters
  const combinedResponse =
    await api.functional.communityPlatform.admin.salesordernotes.index(
      adminConnection,
      {
        body: {
          id: "",
          note: "delivery", // Keyword search
          created_at: "2024-01-01T00:00:00Z", // Date filter
        } satisfies ICommunityPlatformSalesOrderNote.IRequest,
      },
    );
  typia.assert(combinedResponse);
  // Validate all notes match both filters
  const combinedNotes = combinedResponse.data;
  const allMatchCombinedFilter = combinedNotes.every((note) => {
    const keywordMatch =
      note.content?.toLowerCase().includes("delivery") || false;
    const noteDate = new Date(note.created).getTime();
    const start = new Date("2024-01-01T00:00:00Z").getTime();
    const dateMatch = noteDate >= start;
    return keywordMatch && dateMatch;
  });
  TestValidator.predicate("combined filters work", allMatchCombinedFilter);
  // Test 6: Validate sorting by created date descending
  if (allNotesResponse.data.length > 1) {
    const firstNoteDate = new Date(allNotesResponse.data[0].created).getTime();
    const secondNoteDate = new Date(allNotesResponse.data[1].created).getTime();
    TestValidator.predicate(
      "notes are sorted by created date descending",
      firstNoteDate >= secondNoteDate,
    );
  }
  // Test 7: Validate admin has access to data
  TestValidator.predicate(
    "admin has access to sales order notes",
    allNotesResponse.data.length > 0,
  );
}
