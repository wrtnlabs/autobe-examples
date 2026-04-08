import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuest";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_guests_pagination_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Test basic pagination with default parameters
  const defaultPage = await api.functional.hrmPlatform.guests.index(
    connection,
    {
      body: {},
    },
  );
  typia.assert(defaultPage);
  // Verify pagination metadata
  TestValidator.equals(
    "pagination has current page",
    defaultPage.pagination.current,
    defaultPage.pagination.current,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    defaultPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    defaultPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    defaultPage.pagination.pages >= 0,
  );
  // Verify data array structure
  if (defaultPage.data.length > 0) {
    const firstGuest: IHrmPlatformGuest.ISummary = defaultPage.data[0];
    TestValidator.equals(
      "guest has valid UUID",
      firstGuest.id !== undefined,
      true,
    );
    TestValidator.equals(
      "guest has device_identifier",
      firstGuest.device_identifier !== undefined,
      true,
    );
    TestValidator.equals(
      "guest has created_at",
      firstGuest.created_at !== undefined,
      true,
    );
  }
  // 2. Test filtering by device identifier
  const deviceFilter = typia.random<string & tags.Format<"uuid">>();
  const deviceFilteredPage = await api.functional.hrmPlatform.guests.index(
    connection,
    {
      body: {
        device_identifier: deviceFilter,
      },
    },
  );
  typia.assert(deviceFilteredPage);
  // All returned guests should be valid summaries
  for (const guest of deviceFilteredPage.data) {
    typia.assert(guest);
  }
  // 3. Test filtering by IP address
  const ipFilter = "192.168.1.1";
  const ipFilteredPage = await api.functional.hrmPlatform.guests.index(
    connection,
    {
      body: {
        ip_address: ipFilter,
      },
    },
  );
  typia.assert(ipFilteredPage);
  // 4. Test filtering by user agent
  const userAgentFilter = "Mozilla";
  const userAgentFilteredPage = await api.functional.hrmPlatform.guests.index(
    connection,
    {
      body: {
        user_agent: userAgentFilter,
      },
    },
  );
  typia.assert(userAgentFilteredPage);
  // 5. Test date range filtering by created_at
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateFilteredPage = await api.functional.hrmPlatform.guests.index(
    connection,
    {
      body: {
        created_at: {
          gte: oneMonthAgo.toISOString(),
          lte: now.toISOString(),
        },
      },
    },
  );
  typia.assert(dateFilteredPage);
  // Verify all returned guests are within the date range
  for (const guest of dateFilteredPage.data) {
    const guestCreatedAt = new Date(guest.created_at);
    TestValidator.predicate(
      "guest created_at is within date range",
      guestCreatedAt >= oneMonthAgo && guestCreatedAt <= now,
    );
  }
  // 6. Test sorting functionality
  // Sort by created_at ascending
  const sortedAsc = await api.functional.hrmPlatform.guests.index(connection, {
    body: {
      sortBy: "created_at",
      sortOrder: "ASC",
    },
  });
  typia.assert(sortedAsc);
  if (sortedAsc.data.length > 1) {
    for (let i = 1; i < sortedAsc.data.length; i++) {
      TestValidator.predicate(
        "records are sorted in ascending order",
        new Date(sortedAsc.data[i].created_at) >=
          new Date(sortedAsc.data[i - 1].created_at),
      );
    }
  }
  // Sort by created_at descending
  const sortedDesc = await api.functional.hrmPlatform.guests.index(connection, {
    body: {
      sortBy: "created_at",
      sortOrder: "DESC",
    },
  });
  typia.assert(sortedDesc);
  if (sortedDesc.data.length > 1) {
    for (let i = 1; i < sortedDesc.data.length; i++) {
      TestValidator.predicate(
        "records are sorted in descending order",
        new Date(sortedDesc.data[i].created_at) <=
          new Date(sortedDesc.data[i - 1].created_at),
      );
    }
  }
  // 7. Test cursor-based pagination
  const firstPage = await api.functional.hrmPlatform.guests.index(connection, {
    body: {
      limit: 10,
    },
  });
  typia.assert(firstPage);
  // 8. Test limit parameter
  const limitedPage = await api.functional.hrmPlatform.guests.index(
    connection,
    {
      body: {
        limit: 5,
      },
    },
  );
  typia.assert(limitedPage);
  TestValidator.equals(
    "limit parameter applied",
    limitedPage.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "returned records do not exceed limit",
    limitedPage.data.length <= limitedPage.pagination.limit,
  );
  // 9. Verify response structure
  TestValidator.equals(
    "response has pagination object",
    "pagination" in defaultPage,
    true,
  );
  TestValidator.equals("response has data array", "data" in defaultPage, true);
  TestValidator.equals(
    "pagination has current",
    "current" in defaultPage.pagination,
    true,
  );
  TestValidator.equals(
    "pagination has limit",
    "limit" in defaultPage.pagination,
    true,
  );
  TestValidator.equals(
    "pagination has records",
    "records" in defaultPage.pagination,
    true,
  );
  TestValidator.equals(
    "pagination has pages",
    "pages" in defaultPage.pagination,
    true,
  );
}
