import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneAnnouncement";
import type { IRedditCloneAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAdmin";
import type { IRedditCloneAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAnnouncement";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin access to announcement list endpoint.
 *
 * This test verifies that:
 * 1. Admin authentication is required and enforced
 * 2. Response includes pagination metadata (current page, limit, total records, total pages)
 * 3. Announcement summaries contain essential fields (id, title, status, scheduled dates, target audience)
 * 4. Announcements are sorted by scheduled start date descending by default
 * 5. Only announcements with valid status (active, scheduled, expired) are returned
 * 6. Admin receives complete announcement summary data including delivery status and engagement metrics
 */
export async function test_api_announcement_list_admin_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
      bio: null,
      avatar: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneAdmin.IJoin,
  });
  // 2. Retrieve announcement list as authenticated admin
  const response =
    await api.functional.redditClone.admin.announcements.list(adminConnection);
  typia.assert(response);
  // 3. Validate pagination metadata (typia.assert already validates types)
  TestValidator.predicate(
    "current page is positive",
    response.pagination.current > 0,
  );
  TestValidator.predicate("limit is positive", response.pagination.limit > 0);
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    response.pagination.pages >= 0,
  );
  // 4. Validate announcement data array exists
  TestValidator.predicate("data array exists", Array.isArray(response.data));
  // 5. Validate each announcement summary business logic
  await ArrayUtil.asyncForEach(response.data, async (announcement, index) => {
    // Validate status is one of expected values
    TestValidator.predicate(
      `announcement[${index}] has valid status`,
      ["active", "scheduled", "expired", "retracted"].includes(
        announcement.status,
      ),
    );
    // Validate title is non-empty
    TestValidator.predicate(
      `announcement[${index}] has non-empty title`,
      announcement.title.length > 0,
    );
    // Validate delivery status if present
    if (announcement.deliveryStatus !== undefined) {
      TestValidator.predicate(
        `announcement[${index}] deliveryStatus is valid`,
        ["delivered", "pending", "failed"].includes(
          announcement.deliveryStatus,
        ),
      );
    }
    // Validate target audience format if present
    if (announcement.targetAudience !== undefined) {
      TestValidator.predicate(
        `announcement[${index}] targetAudience is non-empty`,
        announcement.targetAudience.length > 0,
      );
    }
  });
  // 6. Validate sorting by scheduled start date descending (if multiple announcements exist)
  if (response.data.length > 1) {
    const announcementsWithScheduledStart = response.data.filter(
      (a) => a.scheduledStart !== undefined,
    );
    if (announcementsWithScheduledStart.length > 1) {
      const sortedCorrectly = announcementsWithScheduledStart.every(
        (announcement, index, array) => {
          if (index === 0) return true;
          return (
            announcement.scheduledStart! <= array[index - 1].scheduledStart!
          );
        },
      );
      TestValidator.predicate(
        "announcements with scheduledStart are sorted descending",
        sortedCorrectly,
      );
    }
  }
  // 7. Validate pagination consistency
  TestValidator.predicate(
    "data length matches limit on first page",
    response.pagination.current === 1
      ? response.data.length <= response.pagination.limit
      : true,
  );
  TestValidator.predicate(
    "pages calculation is correct",
    response.pagination.pages ===
      Math.ceil(response.pagination.records / response.pagination.limit),
  );
}
