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
 * Test that a guest user can query platform-wide announcements with default pagination.
 * Validates response structure, pagination metadata, and announcement summary fields.
 */
export async function test_api_announcements_guest_query_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest registration
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
  // 2. Query announcements with default pagination (no explicit parameters)
  const response = await api.functional.redditClone.guest.announcements.index(
    guestConnection,
    {
      body: {} satisfies IRedditCloneAnnouncement.IRequest,
    },
  );
  typia.assert(response);
  // 3. Validate pagination structure with default values
  TestValidator.equals("default page is 1", response.pagination.current, 1);
  TestValidator.equals("default limit is 20", response.pagination.limit, 20);
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    response.pagination.pages >= 0,
  );
  // 4. Validate pagination calculation consistency
  const expectedPages =
    response.pagination.records === 0
      ? 0
      : Math.ceil(response.pagination.records / response.pagination.limit);
  TestValidator.equals(
    "pages calculation correct",
    response.pagination.pages,
    expectedPages,
  );
  // 5. Validate data array structure
  TestValidator.predicate("data is array", Array.isArray(response.data));
  // 6. Validate each announcement summary has required fields
  await ArrayUtil.asyncForEach(response.data, async (announcement, index) => {
    typia.assert(announcement);
    // Validate required fields exist and have valid values
    TestValidator.predicate(
      `announcement[${index}] has non-empty id`,
      announcement.id.length > 0,
    );
    TestValidator.predicate(
      `announcement[${index}] has non-empty title`,
      announcement.title.length > 0,
    );
    TestValidator.predicate(
      `announcement[${index}] has valid status`,
      ["active", "scheduled", "expired", "retracted"].includes(
        announcement.status,
      ),
    );
    TestValidator.predicate(
      `announcement[${index}] has non-empty createdAt`,
      announcement.createdAt.length > 0,
    );
    TestValidator.predicate(
      `announcement[${index}] has non-empty updatedAt`,
      announcement.updatedAt.length > 0,
    );
    // Validate optional fields if present
    if (announcement.targetAudience !== undefined) {
      TestValidator.predicate(
        `announcement[${index}] targetAudience is non-empty`,
        announcement.targetAudience.length > 0,
      );
    }
    if (announcement.deliveryStatus !== undefined) {
      TestValidator.predicate(
        `announcement[${index}] deliveryStatus is valid`,
        ["delivered", "pending", "failed"].includes(
          announcement.deliveryStatus,
        ),
      );
    }
  });
}
