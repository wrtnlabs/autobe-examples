import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityHubGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityHubGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityHubGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test basic guest listing retrieval without filters.
 *
 * Verifies that the guest listing endpoint returns a paginated list of guest
 * records when called without any filter parameters. Validates that the default
 * first page is returned with correct pagination metadata and that records are
 * sorted by created_at in descending order.
 *
 * 1. Call the guest listing endpoint with an empty request body.
 * 2. Validate response structure with typia.assert.
 * 3. Verify pagination metadata: current page is 1, default limit is 20,
 *    records and pages are non-negative.
 * 4. Verify data array ordering: records are sorted by created_at descending.
 */
export async function test_api_guest_listing_basic_retrieval(
  connection: api.IConnection,
): Promise<void> {
  const page = await api.functional.communityHub.guests.index(connection, {
    body: {} satisfies ICommunityHubGuest.IRequest,
  });
  typia.assert(page);
  TestValidator.equals("pagination current page", page.pagination.current, 1);
  TestValidator.equals("pagination limit", page.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    page.pagination.pages >= 0,
  );
  if (page.data.length > 1) {
    for (let i = 0; i < page.data.length - 1; i++) {
      TestValidator.predicate(
        "records sorted by created_at descending",
        page.data[i].created_at >= page.data[i + 1].created_at,
      );
    }
  }
}
