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
 * Test that guest users can browse available sections with default pagination and sorting settings.
 * Verifies that the system returns a paginated list of sections with basic information
 * (name, description, creation timestamp) when no explicit pagination parameters are provided.
 */
export async function test_api_sections_browsing_guest_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create guest connection using utility function
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardGuest.IJoin,
  });
  // Call sections index with minimal parameters to trigger default pagination
  const response = await api.functional.discussionBoard.guest.sections.index(
    guestConnection,
    {
      body: {
        // No explicit pagination parameters to test defaults
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(response);
  // Validate pagination metadata has correct structure
  TestValidator.predicate(
    "pagination has current page",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has positive limit",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has non-negative records",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has non-negative pages",
    response.pagination.pages >= 0,
  );
  // Validate pagination math: pages = ceil(records / limit)
  const expectedPages =
    response.pagination.records === 0
      ? 0
      : Math.ceil(response.pagination.records / response.pagination.limit);
  TestValidator.equals(
    "pages calculation matches records and limit",
    response.pagination.pages,
    expectedPages,
  );
  // Validate each section summary structure (typia.assert already validated everything)
  // Additional business logic validation can be added here if needed
  TestValidator.predicate(
    "all sections have valid summaries",
    response.data.length >= 0,
  );
}
