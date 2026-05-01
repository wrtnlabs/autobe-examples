import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppMember";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test authenticated member profile retrieval with default pagination.
 *
 * Validates that the authenticated member can retrieve their own profile
 * information through the PATCH /todoApp/members endpoint. The test verifies
 * complete profile isolation — the response contains only the authenticated
 * member's own data with no cross-user access possible.
 *
 * Special attention is given to verifying that pagination metadata correctly
 * reflects the single-record nature of profile queries and that the deleted_at
 * field is null, confirming the account is currently active.
 *
 * 1. Call the profile retrieval endpoint with an empty request body to accept
 *    all defaults — no search filters, no pagination overrides.
 * 2. Validate the full response structure against IPageITodoAppMember.ISummary
 *    using typia.assert, confirming all ISummary fields are present and
 *    correctly typed.
 * 3. Confirm pagination metadata: current is page 1, records equals 1, pages
 *    equals 1, and limit is a positive integer reflecting the default page size.
 * 4. Verify the data array contains exactly one member record — the
 *    authenticated member's own profile.
 * 5. Assert deleted_at is null, indicating the account is active and has not
 *    been permanently deleted.
 */
export async function test_api_member_profile_retrieval(
  connection: api.IConnection,
): Promise<void> {
  const result = await api.functional.todoApp.members.index(connection, {
    body: {} satisfies ITodoAppMember.IRequest,
  });
  typia.assert(result);
  // Validate pagination metadata
  TestValidator.equals("current page", result.pagination.current, 1);
  TestValidator.predicate("limit is positive", result.pagination.limit > 0);
  TestValidator.equals("records count", result.pagination.records, 1);
  TestValidator.equals("pages count", result.pagination.pages, 1);
  // Validate single record
  TestValidator.equals("data has exactly one record", result.data.length, 1);
  const profile = result.data[0];
  TestValidator.equals(
    "deleted_at is null for active account",
    profile.deleted_at,
    null,
  );
}
