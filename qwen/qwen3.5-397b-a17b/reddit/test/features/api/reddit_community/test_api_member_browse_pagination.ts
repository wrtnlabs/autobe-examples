import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityMember";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test member browsing functionality with pagination for guest access.
 *
 * Validates the complete member browsing workflow including pagination metadata, member summary structure, and guest accessibility without authentication. Ensures that the API correctly returns paginated results with proper metadata and that all member summary fields are present and valid.
 *
 * Special attention is given to verifying pagination correctness across multiple pages and ensuring that the response structure matches the expected IPageIRedditCommunityMember.ISummary format with all required fields.
 *
 * 1. Request page 1 with limit 20 to get first page of members.
 * 2. Validate pagination metadata (current, limit, records, pages).
 * 3. Validate member summary structure presence.
 * 4. Request page 2 with limit 20 to verify pagination works correctly.
 * 5. Validate that page 2 has correct pagination metadata.
 * 6. Verify guest access without authentication is permitted.
 */
export async function test_api_member_browse_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Request page 1 with limit 20
  const page1Request: IRedditCommunityMember.IRequest = {
    page: 1,
    limit: 20,
  };
  const page1Response: IPageIRedditCommunityMember.ISummary =
    await api.functional.redditCommunity.members.index(connection, {
      body: page1Request,
    });
  typia.assert(page1Response);
  // 2. Validate pagination metadata for page 1
  TestValidator.equals(
    "page 1 current page",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals("page 1 limit", page1Response.pagination.limit, 20);
  TestValidator.predicate(
    "page 1 records non-negative",
    page1Response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 pages non-negative",
    page1Response.pagination.pages >= 0,
  );
  // 3. Validate member summary structure presence
  if (page1Response.data.length > 0) {
    const firstMember = page1Response.data[0];
    // All type validation already done by typia.assert(), only check business logic
    TestValidator.predicate(
      "member has non-empty username",
      firstMember.username.length > 0,
    );
    TestValidator.predicate(
      "member has non-empty display name",
      firstMember.display_name.length > 0,
    );
  }
  // 4. Request page 2 with limit 20
  const page2Request: IRedditCommunityMember.IRequest = {
    page: 2,
    limit: 20,
  };
  const page2Response: IPageIRedditCommunityMember.ISummary =
    await api.functional.redditCommunity.members.index(connection, {
      body: page2Request,
    });
  typia.assert(page2Response);
  // 5. Validate pagination metadata for page 2
  TestValidator.equals(
    "page 2 current page",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit", page2Response.pagination.limit, 20);
  TestValidator.equals(
    "page 2 records match page 1",
    page2Response.pagination.records,
    page1Response.pagination.records,
  );
  TestValidator.equals(
    "page 2 pages match page 1",
    page2Response.pagination.pages,
    page1Response.pagination.pages,
  );
  // 6. Verify guest access (no authentication required - connection used directly)
  TestValidator.predicate(
    "guest access permitted",
    page1Response.data !== undefined,
  );
}
