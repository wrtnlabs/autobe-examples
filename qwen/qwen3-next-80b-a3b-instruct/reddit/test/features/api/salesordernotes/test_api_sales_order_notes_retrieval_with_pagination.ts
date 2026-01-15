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
export async function test_api_sales_order_notes_retrieval_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate admin using utility function (MANDATORY)
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join" as const,
      referrer: "https://example.com" as const,
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Define test date range
  const startDate = "2026-01-01T00:00:00Z";
  const endDate = "2026-01-31T23:59:59Z";
  // Define filter criteria - ALL parameters are included in the body object
  // IRequest only contains: id (saleId), created_at, note
  const filterCriteria: ICommunityPlatformSalesOrderNote.IRequest = {
    id: "sale-12345", // sale ID filter
    created_at: startDate, // creation date filter (start)
    note: "", // empty note filter (matches any)
  } satisfies ICommunityPlatformSalesOrderNote.IRequest;
  // Execute the paginated retrieval - requires Props with body property
  const result: IPageICommunityPlatformSalesOrderNote =
    await api.functional.communityPlatform.admin.salesordernotes.index(
      adminConnection,
      {
        body: filterCriteria,
      },
    );
  // Validate response type
  typia.assert(result);
  // Validate pagination metadata
  TestValidator.equals("current page is 1", result.pagination.current, 1);
  TestValidator.equals("limit is 10", result.pagination.limit, 10);
  TestValidator.predicate(
    "total records is greater than 0",
    result.pagination.records > 0,
  );
  TestValidator.predicate(
    "total pages is greater than 0",
    result.pagination.pages > 0,
  );
  // Validate that all returned notes match filters
  for (let note of result.data) {
    // Verify note belongs to the specified sale ID
    TestValidator.equals(
      "note sale ID matches filter",
      note.note_id,
      "sale-12345",
    );
    // Verify note creation date is within date range
    const createdAt = new Date(note.created);
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    TestValidator.predicate(
      "note created after start date",
      createdAt >= startDateObj,
    );
    TestValidator.predicate(
      "note created before end date",
      createdAt <= endDateObj,
    );
    // Verify note content has required length
    TestValidator.predicate(
      "note content is not empty",
      note.content.length >= 1,
    );
    TestValidator.predicate(
      "note content is not too long",
      note.content.length <= 10000,
    );
    // Validate required fields are not null
    TestValidator.notEquals("note note_id is not null", note.note_id, null);
    TestValidator.notEquals("note content is not null", note.content, null);
    TestValidator.notEquals("note created is not null", note.created, null);
    TestValidator.notEquals("note updated is not null", note.updated, null);
    // Verify timestamp formats
    TestValidator.predicate(
      "created is ISO date-time",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(note.created),
    );
    TestValidator.predicate(
      "updated is ISO date-time",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(note.updated),
    );
  }
  // Verify all notes are sorted in ascending order by created_at
  for (let i = 1; i < result.data.length; i++) {
    const currentNote = result.data[i];
    const previousNote = result.data[i - 1];
    TestValidator.predicate(
      "notes sorted chronologically",
      new Date(currentNote.created) >= new Date(previousNote.created),
    );
  }
}
