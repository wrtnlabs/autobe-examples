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
 * Test guest user can search announcements by text and filter by target audience.
 * 1. Guest joins the platform
 * 2. Search announcements with keyword and targetAudience filter
 * 3. Verify search results match criteria
 * 4. Test deliveryStatus filter
 * 5. Test sorting by scheduledAt
 */
export async function test_api_announcements_guest_search_and_target_audience_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest joins the platform
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
  // 2. Search announcements with keyword and targetAudience filter
  const searchKeyword = "update";
  const announcementsResult =
    await api.functional.redditClone.guest.announcements.index(
      guestConnection,
      {
        body: {
          search: searchKeyword,
          targetAudience: "all",
          deliveryStatus: "delivered",
          sortBy: "scheduledAt",
          sortOrder: "desc",
          page: 1,
          limit: 20,
        } satisfies IRedditCloneAnnouncement.IRequest,
      },
    );
  typia.assert(announcementsResult);
  // 3. Verify search results match criteria
  TestValidator.equals(
    "pagination current page",
    announcementsResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "all results have targetAudience 'all'",
    announcementsResult.data.every(
      (announcement) =>
        announcement.targetAudience === "all" ||
        announcement.targetAudience?.startsWith("all"),
    ),
  );
  TestValidator.predicate(
    "all results have deliveryStatus 'delivered'",
    announcementsResult.data.every(
      (announcement) =>
        announcement.deliveryStatus === "delivered" ||
        announcement.deliveryStatus?.includes("delivered"),
    ),
  );
  TestValidator.predicate(
    "all results contain search keyword in title",
    announcementsResult.data.every((announcement) =>
      announcement.title.toLowerCase().includes(searchKeyword.toLowerCase()),
    ),
  );
  // 4. Test with different targetAudience filter (community)
  const communityAnnouncements =
    await api.functional.redditClone.guest.announcements.index(
      guestConnection,
      {
        body: {
          targetAudience: "community",
          page: 1,
          limit: 10,
        } satisfies IRedditCloneAnnouncement.IRequest,
      },
    );
  typia.assert(communityAnnouncements);
  TestValidator.predicate(
    "community announcements have community targetAudience",
    communityAnnouncements.data.every(
      (announcement) =>
        announcement.targetAudience === "community" ||
        announcement.targetAudience?.startsWith("community"),
    ),
  );
  // 5. Test sorting by scheduledAt
  if (announcementsResult.data.length >= 2) {
    TestValidator.predicate(
      "announcements sorted by scheduledAt descending",
      announcementsResult.data.every((announcement, index, array) => {
        if (index === 0 || !announcement.scheduledStart) return true;
        const prev = array[index - 1];
        if (!prev.scheduledStart || !announcement.scheduledStart) return true;
        return new Date(prev.scheduledStart) >= new Date(announcement.scheduledStart);
      }),
    );
  }
  // 6. Test pagination
  TestValidator.equals(
    "pagination limit matches request",
    announcementsResult.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    announcementsResult.data.length <= 20,
  );
  TestValidator.predicate(
    "total pages calculated correctly",
    announcementsResult.pagination.pages ===
      Math.ceil(announcementsResult.pagination.records / 20),
  );
}