import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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
 * Test the basic section browsing functionality for guest users.
 * Verify that guests can retrieve a paginated list of all available sections
 * without any search filters. Validate that the response includes essential
 * section information: id, name, description, and created_at timestamp.
 * Check that the pagination metadata is correctly populated with current page,
 * limit, total records, and total pages.
 */
export async function test_api_section_browsing_basic_discovery(
  connection: api.IConnection,
): Promise<void> {
  // 1. Establish guest session for anonymous browsing access
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardGuest.IJoin,
  });
  // 2. Retrieve paginated list of sections with default parameters
  const sections = await api.functional.discussionBoard.guest.topics.index(
    guestConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(sections);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "current page should be 1",
    sections.pagination.current,
    1,
  );
  TestValidator.equals("limit should be 10", sections.pagination.limit, 10);
  TestValidator.predicate(
    "total records should be non-negative",
    sections.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be non-negative",
    sections.pagination.pages >= 0,
  );
  // 4. Validate data consistency (business logic, not type validation)
  TestValidator.predicate(
    "data array length should match pagination logic",
    sections.data.length <= sections.pagination.limit,
  );
  if (sections.pagination.records > 0) {
    TestValidator.predicate(
      "should have at least one section when records exist",
      sections.data.length > 0,
    );
  }
}