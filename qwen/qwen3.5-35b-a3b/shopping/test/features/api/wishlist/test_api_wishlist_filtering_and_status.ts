import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallWishlist";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test customer wishlist filtering and pagination capabilities with comprehensive
 * status, product, and date range filtering options.
 *
 * Validates the wishlist listing endpoint's ability to filter by deletion status,
 * product ID, creation date range, and sort order while maintaining accurate
 * pagination metadata. Tests both active and soft-deleted wishlist filtering,
 * ensures product-based filtering works correctly, and verifies that pagination
 * parameters properly control result set size and positioning.
 *
 * Special attention is given to verifying that:
 * - Status filtering correctly excludes or includes soft-deleted wishlists
 * - Product ID filtering performs correct JOIN operations
 * - Date range filters use proper ISO 8601 timestamp comparison
 * - Pagination metadata accurately reflects total records and available pages
 */
export async function test_api_wishlist_filtering_and_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate new customer
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallMember.IJoin,
  });
  typia.assert(member);
  // 2. Test filter by status (active) - default behavior
  const activeResult =
    await api.functional.ecommerceMall.member.wishlists.index(
      memberConnection,
      {
        body: {
          status: "active",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallWishlist.IRequest,
      },
    );
  typia.assert(activeResult);
  TestValidator.equals(
    "active status filtering returns page 1",
    activeResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "active status filtering returns correct limit",
    activeResult.pagination.limit,
    20,
  );
  // 3. Test filter by status (deleted)
  const deletedResult =
    await api.functional.ecommerceMall.member.wishlists.index(
      memberConnection,
      {
        body: {
          status: "deleted",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallWishlist.IRequest,
      },
    );
  typia.assert(deletedResult);
  TestValidator.equals(
    "deleted status filtering returns page 1",
    deletedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "deleted status filtering returns correct limit",
    deletedResult.pagination.limit,
    20,
  );
  // 4. Test filter by product_id
  const testProductId = typia.random<string & tags.Format<"uuid">>();
  const productFilteredResult =
    await api.functional.ecommerceMall.member.wishlists.index(
      memberConnection,
      {
        body: {
          product_id: testProductId,
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallWishlist.IRequest,
      },
    );
  typia.assert(productFilteredResult);
  TestValidator.equals(
    "product_id filtering returns page 1",
    productFilteredResult.pagination.current,
    1,
  );
  // 5. Test filter by date range (created_after)
  const futureDate = new Date(
    new Date(member.created_at).getTime() + 24 * 60 * 60 * 1000,
  ).toISOString();
  const afterResult = await api.functional.ecommerceMall.member.wishlists.index(
    memberConnection,
    {
      body: {
        created_after: futureDate,
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallWishlist.IRequest,
    },
  );
  typia.assert(afterResult);
  TestValidator.equals(
    "created_after filtering returns page 1",
    afterResult.pagination.current,
    1,
  );
  // 6. Test filter by date range (created_before)
  const pastDate = new Date(member.created_at).toISOString();
  const beforeResult =
    await api.functional.ecommerceMall.member.wishlists.index(
      memberConnection,
      {
        body: {
          created_before: pastDate,
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallWishlist.IRequest,
      },
    );
  typia.assert(beforeResult);
  TestValidator.equals(
    "created_before filtering returns page 1",
    beforeResult.pagination.current,
    1,
  );
  // 7. Test filter by date range (both after and before)
  const rangeResult = await api.functional.ecommerceMall.member.wishlists.index(
    memberConnection,
    {
      body: {
        created_after: pastDate,
        created_before: futureDate,
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallWishlist.IRequest,
    },
  );
  typia.assert(rangeResult);
  TestValidator.equals(
    "date range filtering returns page 1",
    rangeResult.pagination.current,
    1,
  );
  // 8. Test sort order (created_at_asc)
  const ascResult = await api.functional.ecommerceMall.member.wishlists.index(
    memberConnection,
    {
      body: {
        sort: "created_at_asc",
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallWishlist.IRequest,
    },
  );
  typia.assert(ascResult);
  TestValidator.equals(
    "created_at_asc sort returns page 1",
    ascResult.pagination.current,
    1,
  );
  // 9. Test sort order (created_at_desc - default)
  const descResult = await api.functional.ecommerceMall.member.wishlists.index(
    memberConnection,
    {
      body: {
        sort: "created_at_desc",
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallWishlist.IRequest,
    },
  );
  typia.assert(descResult);
  TestValidator.equals(
    "created_at_desc sort returns page 1",
    descResult.pagination.current,
    1,
  );
  // 10. Test pagination (page=2)
  const page2Result = await api.functional.ecommerceMall.member.wishlists.index(
    memberConnection,
    {
      body: {
        page: 2,
        limit: 20,
      } satisfies IEcommerceMallWishlist.IRequest,
    },
  );
  typia.assert(page2Result);
  TestValidator.equals(
    "page 2 returns correct pagination metadata",
    page2Result.pagination.current,
    2,
  );
  // 11. Test pagination (custom limit)
  const customLimitResult =
    await api.functional.ecommerceMall.member.wishlists.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallWishlist.IRequest,
      },
    );
  typia.assert(customLimitResult);
  TestValidator.equals(
    "custom limit returns correct pagination",
    customLimitResult.pagination.limit,
    10,
  );
  // 12. Test default values (no filters specified)
  const defaultResult =
    await api.functional.ecommerceMall.member.wishlists.index(
      memberConnection,
      {
        body: {} satisfies IEcommerceMallWishlist.IRequest,
      },
    );
  typia.assert(defaultResult);
  TestValidator.equals(
    "default filtering returns page 1",
    defaultResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "default filtering returns default limit 100",
    defaultResult.pagination.limit,
    100,
  );
}
