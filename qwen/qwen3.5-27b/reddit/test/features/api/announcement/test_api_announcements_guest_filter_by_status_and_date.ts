import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneAnnouncement";
import type { IRedditCloneAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAnnouncement";
import type { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test that a guest user can filter announcements by status and date range.
 *
 * This test verifies:
 * 1. Guest authentication and connection setup
 * 2. Filtering announcements by status (active, scheduled, expired, retracted)
 * 3. Filtering announcements by date range (startDate, endDate)
 * 4. Proper sorting by createdAt in descending order
 * 5. Pagination metadata accuracy
 * 6. Response validation with typia.assert
 */
export async function test_api_announcements_guest_filter_by_status_and_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest authentication
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      ip_address: typia.random<string & tags.Format<"ipv4">>(),
      user_agent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneGuest.IJoin,
  });
  // 2. Prepare date range filters
  const now = new Date();
  const startDate = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days ago
  const endDate = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days from now
  // 3. Test filtering by status "active" and date range
  const activeFilter = {
    status: "active" as const,
    startDate,
    endDate,
    sortBy: "createdAt" as const,
    sortOrder: "desc" as const,
    page: 1,
    limit: 20,
  } satisfies IRedditCloneAnnouncement.IRequest;
  const activeResponse =
    await api.functional.redditClone.guest.announcements.index(
      guestConnection,
      { body: activeFilter },
    );
  typia.assert(activeResponse);
  // 4. Validate active announcements
  TestValidator.equals(
    "active filter returns correct status",
    activeResponse.data.every((a) => a.status === "active"),
    true,
  );
  // 5. Validate date range filtering for active announcements
  activeResponse.data.forEach((announcement) => {
    if (announcement.scheduledStart) {
      TestValidator.predicate(
        `announcement ${announcement.id} scheduledStart >= startDate`,
        new Date(announcement.scheduledStart) >= new Date(startDate),
      );
    }
    if (announcement.scheduledEnd) {
      TestValidator.predicate(
        `announcement ${announcement.id} scheduledEnd <= endDate`,
        new Date(announcement.scheduledEnd) <= new Date(endDate),
      );
    }
  });
  // 6. Validate pagination
  TestValidator.equals(
    "pagination current page",
    activeResponse.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", activeResponse.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records count matches data length",
    activeResponse.pagination.records === activeResponse.data.length,
  );
  // 7. Test filtering by status "scheduled"
  const scheduledFilter = {
    status: "scheduled" as const,
    sortBy: "createdAt" as const,
    sortOrder: "desc" as const,
  } satisfies IRedditCloneAnnouncement.IRequest;
  const scheduledResponse =
    await api.functional.redditClone.guest.announcements.index(
      guestConnection,
      { body: scheduledFilter },
    );
  typia.assert(scheduledResponse);
  TestValidator.equals(
    "scheduled filter returns correct status",
    scheduledResponse.data.every((a) => a.status === "scheduled"),
    true,
  );
  // 8. Test filtering by status "expired"
  const expiredFilter = {
    status: "expired" as const,
    sortBy: "createdAt" as const,
    sortOrder: "desc" as const,
  } satisfies IRedditCloneAnnouncement.IRequest;
  const expiredResponse =
    await api.functional.redditClone.guest.announcements.index(
      guestConnection,
      { body: expiredFilter },
    );
  typia.assert(expiredResponse);
  TestValidator.equals(
    "expired filter returns correct status",
    expiredResponse.data.every((a) => a.status === "expired"),
    true,
  );
  // 9. Test filtering by status "retracted"
  const retractedFilter = {
    status: "retracted" as const,
    sortBy: "createdAt" as const,
    sortOrder: "desc" as const,
  } satisfies IRedditCloneAnnouncement.IRequest;
  const retractedResponse =
    await api.functional.redditClone.guest.announcements.index(
      guestConnection,
      { body: retractedFilter },
    );
  typia.assert(retractedResponse);
  TestValidator.equals(
    "retracted filter returns correct status",
    retractedResponse.data.every((a) => a.status === "retracted"),
    true,
  );
  // 10. Test without status filter (should return all statuses)
  const allFilter = {
    sortBy: "createdAt" as const,
    sortOrder: "desc" as const,
  } satisfies IRedditCloneAnnouncement.IRequest;
  const allResponse =
    await api.functional.redditClone.guest.announcements.index(
      guestConnection,
      { body: allFilter },
    );
  typia.assert(allResponse);
  TestValidator.predicate(
    "no status filter returns announcements with valid statuses",
    allResponse.data.length === 0 ||
      allResponse.data.every((a) =>
        ["active", "scheduled", "expired", "retracted"].includes(a.status),
      ),
  );
  // 11. Test sorting order (createdAt descending)
  for (const index of ArrayUtil.repeat(
    activeResponse.data.length - 1,
    (i) => i + 1,
  )) {
    TestValidator.predicate(
      `announcement ${index} created after announcement ${index - 1}`,
      new Date(activeResponse.data[index].createdAt) <=
        new Date(activeResponse.data[index - 1].createdAt),
    );
  }
}
