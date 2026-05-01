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
 * Test authenticated member profile filtering with email and display name LIKE patterns.
 *
 * Verifies that the authenticated member can filter their own profile using substring-based email and display name matching. Since all filters are scoped exclusively to the authenticated member's own record, the result set always contains at most one record regardless of the filter criteria.
 *
 * Validates that pagination metadata remains consistent (records=1, pages=1) across all filter variations, confirming that profile isolation prevents cross-member data exposure through search filters.
 *
 * 1. Retrieve the full profile without any filters to capture the member's email and display name.
 * 2. Apply an email substring LIKE filter and verify exactly one record is returned with the matching member ID.
 * 3. Apply a display name substring LIKE filter and verify exactly one record is returned with the matching member ID.
 * 4. Validate pagination consistency (records=1, pages=1) for all filter variations.
 */
export async function test_api_member_profile_filter_by_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. Retrieve the authenticated member's profile without any filters
  const fullProfile = await api.functional.todoApp.members.index(connection, {
    body: {} satisfies ITodoAppMember.IRequest,
  });
  typia.assert(fullProfile);
  TestValidator.predicate(
    "pagination records is 1",
    () => fullProfile.pagination.records === 1,
  );
  TestValidator.predicate(
    "pagination pages is 1",
    () => fullProfile.pagination.pages === 1,
  );
  TestValidator.predicate(
    "data contains exactly one record",
    () => fullProfile.data.length === 1,
  );
  const member = fullProfile.data[0];
  // 2. Filter by email substring (LIKE pattern matching)
  const emailSubstring = RandomGenerator.substring(member.email);
  const emailFiltered = await api.functional.todoApp.members.index(connection, {
    body: {
      email: emailSubstring,
    } satisfies ITodoAppMember.IRequest,
  });
  typia.assert(emailFiltered);
  TestValidator.predicate(
    "email filter returns exactly one record",
    () => emailFiltered.data.length === 1,
  );
  TestValidator.predicate(
    "email filter pagination records is 1",
    () => emailFiltered.pagination.records === 1,
  );
  TestValidator.predicate(
    "email filter pagination pages is 1",
    () => emailFiltered.pagination.pages === 1,
  );
  TestValidator.equals(
    "email filter matches same member",
    emailFiltered.data[0].id,
    member.id,
  );
  // 3. Filter by display name substring (LIKE pattern matching)
  const displayNameSubstring = RandomGenerator.substring(member.display_name);
  const nameFiltered = await api.functional.todoApp.members.index(connection, {
    body: {
      display_name: displayNameSubstring,
    } satisfies ITodoAppMember.IRequest,
  });
  typia.assert(nameFiltered);
  TestValidator.predicate(
    "display name filter returns exactly one record",
    () => nameFiltered.data.length === 1,
  );
  TestValidator.predicate(
    "display name filter pagination records is 1",
    () => nameFiltered.pagination.records === 1,
  );
  TestValidator.predicate(
    "display name filter pagination pages is 1",
    () => nameFiltered.pagination.pages === 1,
  );
  TestValidator.equals(
    "display name filter matches same member",
    nameFiltered.data[0].id,
    member.id,
  );
}
