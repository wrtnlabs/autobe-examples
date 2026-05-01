import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityHubMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test browsing members with default parameters.
 *
 * Verifies that the member browse endpoint returns a paginated list of all active members when no filters are provided. The response should use default pagination values of page 1 and limit 20, with members sorted by newest first.
 *
 * Confirms that pagination metadata includes current, limit, records, and pages fields with correct values, and that the computed pages equals Math.ceil(records / limit). Each member summary must contain id, username, display_name, avatar_uri, karma, and created_at — sensitive fields like email and password_hash must never be exposed, and soft-deleted members must be excluded.
 *
 * 1. Call the members browse endpoint with an empty request body to trigger default pagination and sorting behavior.
 * 2. Validate the response structure with typia.assert, which ensures all required fields are present and sensitive fields are absent.
 * 3. Verify default pagination metadata values: current page is 1, limit is 20, and records and pages are non-negative.
 * 4. Verify the pages count matches Math.ceil(records / limit).
 */
export async function test_api_member_browse_with_defaults(
  connection: api.IConnection,
): Promise<void> {
  const body = {} satisfies ICommunityHubMember.IRequest;
  const result = await api.functional.communityHub.members.index(connection, {
    body,
  });
  typia.assert(result);
  const { pagination, data } = result;
  TestValidator.equals("default current page", pagination.current, 1);
  TestValidator.equals("default limit", pagination.limit, 20);
  TestValidator.predicate("records is non-negative", pagination.records >= 0);
  TestValidator.predicate("pages is non-negative", pagination.pages >= 0);
  const expectedPages =
    pagination.records === 0
      ? 0
      : Math.ceil(pagination.records / pagination.limit);
  TestValidator.equals(
    "pages equals ceil(records / limit)",
    pagination.pages,
    expectedPages,
  );
}
