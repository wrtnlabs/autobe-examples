import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test pagination functionality for section browsing.
 * 1. Create a member account and authenticate
 * 2. Test default pagination behavior
 * 3. Verify pagination metadata accuracy
 * 4. Test boundary conditions with available data
 */
export async function test_api_sections_member_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);
  // 2. Test pagination with default parameters (endpoint doesn't support custom pagination)
  const response =
    await api.functional.discussionBoard.member.sections.index(
      memberConnection,
    );
  typia.assert(response);
  // Validate pagination metadata structure
  TestValidator.predicate(
    "pagination metadata exists",
    response.pagination !== undefined,
  );
  TestValidator.predicate("data array exists", Array.isArray(response.data));
  // 3. Test pagination calculations
  const totalRecords = response.pagination.records;
  const pageLimit = response.pagination.limit;
  const totalPages = response.pagination.pages;
  const currentPage = response.pagination.current;
  // Validate pagination metadata
  TestValidator.equals("current page should be 1", currentPage, 1);
  TestValidator.predicate("limit should be positive", pageLimit > 0);
  TestValidator.predicate(
    "records count should be non-negative",
    totalRecords >= 0,
  );
  TestValidator.predicate(
    "pages count should be non-negative",
    totalPages >= 0,
  );
  // Calculate expected pages based on records and limit
  const expectedPages =
    totalRecords === 0 ? 0 : Math.ceil(totalRecords / pageLimit);
  TestValidator.equals(
    "pages calculation should match",
    totalPages,
    expectedPages,
  );
  // 4. Validate data array size matches pagination
  TestValidator.predicate(
    "data array size should not exceed limit",
    response.data.length <= pageLimit,
  );
  // 5. Handle empty sections scenario
  if (totalRecords === 0) {
    TestValidator.equals(
      "data array should be empty when no records",
      response.data.length,
      0,
    );
    TestValidator.equals("pages should be 0 when no records", totalPages, 0);
  } else {
    TestValidator.predicate(
      "data array should contain sections",
      response.data.length > 0,
    );
  }
  // 6. Validate section summary structure for each section
  for (const section of response.data) {
    typia.assert(section);
    TestValidator.predicate(
      "section should have uuid id",
      /^[0-9a-f-]{36}$/i.test(section.id),
    );
    TestValidator.predicate(
      "section should have non-empty name",
      section.name.length > 0,
    );
    TestValidator.predicate(
      "section description should be string or null",
      typeof section.description === "string" || section.description === null,
    );
    TestValidator.predicate(
      "section should have valid ISO created_at",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(section.created_at),
    );
  }
  // Note: The endpoint doesn't support custom pagination parameters, so we can only test
  // the default pagination behavior provided by the API
}
