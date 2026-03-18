import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsGuest";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_guest_index_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Test default pagination with minimal request parameters
  const defaultResponse: IPageIHrmsGuest.ISummary =
    await api.functional.hrms.guests.index(connection, {
      body: {} satisfies IHrmsGuest.IRequest,
    });
  typia.assert(defaultResponse);
  // Validate pagination metadata exists and is valid
  TestValidator.predicate(
    "default pagination has current page",
    defaultResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "default pagination has limit",
    defaultResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "default pagination has records count",
    defaultResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "default pagination has pages count",
    defaultResponse.pagination.pages >= 0,
  );
  // 2. Test custom pagination with explicit page and limit parameters
  const page = 2;
  const limit = 5;
  const customResponse: IPageIHrmsGuest.ISummary =
    await api.functional.hrms.guests.index(connection, {
      body: {
        page,
        limit,
      } satisfies IHrmsGuest.IRequest,
    });
  typia.assert(customResponse);
  TestValidator.equals(
    "custom pagination current page",
    customResponse.pagination.current,
    page,
  );
  TestValidator.equals(
    "custom pagination limit",
    customResponse.pagination.limit,
    limit,
  );
  TestValidator.equals(
    "custom pagination records count",
    customResponse.pagination.records,
    defaultResponse.pagination.records,
  );
  // 3. Test ascending sort order (oldest first)
  const ascResponse: IPageIHrmsGuest.ISummary =
    await api.functional.hrms.guests.index(connection, {
      body: {
        order: "asc",
      } satisfies IHrmsGuest.IRequest,
    });
  typia.assert(ascResponse);
  if (ascResponse.data.length >= 2) {
    // Verify data is sorted by created_at ascending (earliest first)
    for (let i = 1; i < ascResponse.data.length; i++) {
      TestValidator.predicate(
        `ascending sort: ${i}th item created_at >= ${i - 1}th item created_at`,
        new Date(ascResponse.data[i].created_at) >=
          new Date(ascResponse.data[i - 1].created_at),
      );
    }
  }
  // 4. Test descending sort order (newest first) - default
  const descResponse: IPageIHrmsGuest.ISummary =
    await api.functional.hrms.guests.index(connection, {
      body: {
        order: "desc",
      } satisfies IHrmsGuest.IRequest,
    });
  typia.assert(descResponse);
  if (descResponse.data.length >= 2) {
    // Verify data is sorted by created_at descending (latest first)
    for (let i = 1; i < descResponse.data.length; i++) {
      TestValidator.predicate(
        `descending sort: ${i}th item created_at <= ${i - 1}th item created_at`,
        new Date(descResponse.data[i].created_at) <=
          new Date(descResponse.data[i - 1].created_at),
      );
    }
  }
  // 5. Test date range filtering
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dateFilteredResponse: IPageIHrmsGuest.ISummary =
    await api.functional.hrms.guests.index(connection, {
      body: {
        createdAfter: weekAgo.toISOString(),
      } satisfies IHrmsGuest.IRequest,
    });
  typia.assert(dateFilteredResponse);
  // Verify all returned guests were created after the filter date
  for (const guest of dateFilteredResponse.data) {
    const guestDate = new Date(guest.created_at);
    const filterDate = new Date(weekAgo.toISOString());
    TestValidator.predicate(
      `guest ${guest.id} created after filter date`,
      guestDate >= filterDate,
    );
  }
  // 6. Test activeOnly filter
  const activeOnlyResponse: IPageIHrmsGuest.ISummary =
    await api.functional.hrms.guests.index(connection, {
      body: {
        activeOnly: true,
      } satisfies IHrmsGuest.IRequest,
    });
  typia.assert(activeOnlyResponse);
  // 7. Test device fingerprint partial match filter
  const sampleFingerprint = RandomGenerator.alphabets(8);
  const deviceFilteredResponse: IPageIHrmsGuest.ISummary =
    await api.functional.hrms.guests.index(connection, {
      body: {
        deviceFingerprint: sampleFingerprint,
      } satisfies IHrmsGuest.IRequest,
    });
  typia.assert(deviceFilteredResponse);
  // 8. Verify no sensitive authentication token data in response
  for (const guest of defaultResponse.data) {
    // Ensure sensitive fields are not present in summary response
    TestValidator.predicate(
      "guest summary does not contain auth token",
      !("auth_token" in guest),
    );
    TestValidator.predicate(
      "guest summary does not contain session token",
      !("session_token" in guest),
    );
  }
  // 9. Test pagination metadata consistency
  TestValidator.predicate(
    "pages calculated correctly",
    defaultResponse.pagination.records === 0
      ? defaultResponse.pagination.pages === 0
      : defaultResponse.pagination.pages ===
          Math.ceil(
            defaultResponse.pagination.records /
              defaultResponse.pagination.limit,
          ),
  );
  // 10. Test cursor-based pagination
  const cursorResponse: IPageIHrmsGuest.ISummary =
    await api.functional.hrms.guests.index(connection, {
      body: {
        cursor: "test-cursor-123",
      } satisfies IHrmsGuest.IRequest,
    });
  typia.assert(cursorResponse);
}
