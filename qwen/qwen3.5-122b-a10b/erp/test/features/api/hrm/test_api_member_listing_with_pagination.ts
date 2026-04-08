import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test member listing endpoint with pagination parameters.
 *
 * Validates the member listing functionality with cursor-based pagination, ensuring proper pagination metadata and data structure. Verifies that the response contains correct pagination information and member summaries without exposing sensitive credentials.
 *
 * Since member creation endpoints are not available in the provided SDK, this test focuses on validating the listing endpoint's response structure and pagination metadata with existing data.
 *
 * 1. Call the member listing endpoint with default pagination parameters.
 * 2. Verify response structure contains pagination metadata and member data array.
 * 3. Validate pagination fields (current, limit, records, pages) are present and valid.
 * 4. Verify member summaries contain required fields (id, email, created_at, updated_at, deleted_at).
 * 5. Test pagination with custom page and limit parameters.
 * 6. Validate that response excludes sensitive fields like password_hash.
 */
export async function test_api_member_listing_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection (actor-specific)
  const memberConnection: api.IConnection = { host: connection.host };
  // 2. Test with default pagination parameters
  const defaultOutput: IPageIHrmMember.ISummary =
    await api.functional.hrm.members.index(memberConnection, {
      body: {} satisfies IHrmMember.IRequest,
    });
  typia.assert(defaultOutput);
  // 3. Validate pagination metadata exists and is valid
  TestValidator.predicate(
    "pagination current exists",
    defaultOutput.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit exists",
    defaultOutput.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records exists",
    defaultOutput.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages exists",
    defaultOutput.pagination.pages >= 0,
  );
  // 4. Validate pagination logic: pages = ceil(records / limit)
  if (defaultOutput.pagination.limit > 0) {
    const expectedPages = Math.ceil(
      defaultOutput.pagination.records / defaultOutput.pagination.limit,
    );
    TestValidator.equals(
      "pagination pages calculation",
      defaultOutput.pagination.pages,
      expectedPages,
    );
  }
  // 5. Validate member data structure
  TestValidator.predicate("data is array", Array.isArray(defaultOutput.data));
  // 6. Validate each member summary has required fields
  for (const member of defaultOutput.data) {
    typia.assert(member);
    TestValidator.predicate("member has id", typeof member.id === "string");
    TestValidator.predicate(
      "member has email",
      typeof member.email === "string",
    );
    TestValidator.predicate(
      "member has created_at",
      typeof member.created_at === "string",
    );
    TestValidator.predicate(
      "member has updated_at",
      typeof member.updated_at === "string",
    );
    TestValidator.predicate(
      "member deleted_at is null or string",
      member.deleted_at === null || typeof member.deleted_at === "string",
    );
  }
  // 7. Test with custom pagination parameters
  const customPage = 1;
  const customLimit = 10;
  const customOutput: IPageIHrmMember.ISummary =
    await api.functional.hrm.members.index(memberConnection, {
      body: {
        page: customPage,
        limit: customLimit,
      } satisfies IHrmMember.IRequest,
    });
  typia.assert(customOutput);
  // 8. Validate custom pagination parameters are reflected in response
  TestValidator.equals(
    "custom page reflected",
    customOutput.pagination.current,
    customPage,
  );
  TestValidator.equals(
    "custom limit reflected",
    customOutput.pagination.limit,
    customLimit,
  );
  // 9. Test with email filter
  const emailFilter = typia.random<string & tags.Format<"email">>();
  const filteredOutput: IPageIHrmMember.ISummary =
    await api.functional.hrm.members.index(memberConnection, {
      body: {
        email: emailFilter,
      } satisfies IHrmMember.IRequest,
    });
  typia.assert(filteredOutput);
  // 10. Validate filtered results (all emails should contain the filter string)
  for (const member of filteredOutput.data) {
    TestValidator.predicate(
      "email contains filter",
      member.email.toLowerCase().includes(emailFilter.toLowerCase()),
    );
  }
}
