import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneAnnouncement";
import type { IRedditCloneAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAnnouncement";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test pagination functionality for member announcements query.
 * 1. Authenticate as member
 * 2. Query announcements with default pagination (limit=20)
 * 3. Query announcements with custom limit (limit=10)
 * 4. Test page navigation (page=1, page=2)
 * 5. Validate pagination metadata accuracy
 * 6. Verify empty result set returns zero records and pages
 */
export async function test_api_announcements_member_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      bio: null,
      avatar_uri: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  // 2. Query with default pagination (limit should be 20)
  const defaultPageResult =
    await api.functional.redditClone.member.announcements.index(
      memberConnection,
      {
        body: {} satisfies IRedditCloneAnnouncement.IRequest,
      },
    );
  typia.assert(defaultPageResult);
  // Validate default pagination metadata
  TestValidator.equals(
    "default limit is 20",
    defaultPageResult.pagination.limit,
    20,
  );
  TestValidator.equals(
    "default page is 1",
    defaultPageResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "records count matches data length",
    defaultPageResult.pagination.records === defaultPageResult.data.length,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    defaultPageResult.pagination.pages ===
      Math.ceil(
        defaultPageResult.pagination.records /
          defaultPageResult.pagination.limit,
      ),
  );
  // 3. Query with custom limit (limit=10)
  const customLimitResult =
    await api.functional.redditClone.member.announcements.index(
      memberConnection,
      {
        body: {
          limit: 10,
        } satisfies IRedditCloneAnnouncement.IRequest,
      },
    );
  typia.assert(customLimitResult);
  // Validate custom limit
  TestValidator.equals(
    "custom limit is 10",
    customLimitResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "custom limit page is 1",
    customLimitResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "custom limit data length <= limit",
    customLimitResult.data.length <= 10,
  );
  // 4. Test page navigation (page=2)
  const page2Result =
    await api.functional.redditClone.member.announcements.index(
      memberConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IRedditCloneAnnouncement.IRequest,
      },
    );
  typia.assert(page2Result);
  // Validate page navigation
  TestValidator.equals(
    "page 2 current is 2",
    page2Result.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit is 10", page2Result.pagination.limit, 10);
  // If there are enough records, page 2 should have different data than page 1
  if (customLimitResult.pagination.pages >= 2) {
    TestValidator.predicate(
      "page 2 has data when pages >= 2",
      page2Result.data.length > 0,
    );
    // Verify no duplicate IDs between page 1 and page 2
    const page1Ids = new Set(customLimitResult.data.map((d) => d.id));
    const page2Ids = new Set(page2Result.data.map((d) => d.id));
    const hasOverlap = Array.from(page1Ids).some((id) => page2Ids.has(id));
    TestValidator.predicate("no duplicate IDs between pages", !hasOverlap);
  }
  // 5. Test with status filter to potentially get empty results
  const filteredResult =
    await api.functional.redditClone.member.announcements.index(
      memberConnection,
      {
        body: {
          status: "retracted",
          page: 1,
          limit: 5,
        } satisfies IRedditCloneAnnouncement.IRequest,
      },
    );
  typia.assert(filteredResult);
  // Validate filtered pagination metadata
  TestValidator.equals(
    "filtered page is 1",
    filteredResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "filtered limit is 5",
    filteredResult.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "filtered records match data length",
    filteredResult.pagination.records === filteredResult.data.length,
  );
  // 6. Validate empty result set scenario (when no retracted announcements exist)
  if (filteredResult.data.length === 0) {
    TestValidator.equals(
      "empty result has zero records",
      filteredResult.pagination.records,
      0,
    );
    TestValidator.equals(
      "empty result has zero pages",
      filteredResult.pagination.pages,
      0,
    );
  }
  // Additional validation: verify business logic of announcement data
  await ArrayUtil.asyncForEach(defaultPageResult.data, async (announcement) => {
    // Business logic validations only (type validation already done by typia.assert)
    TestValidator.predicate(
      `announcement ${announcement.id} has non-empty title`,
      announcement.title.length > 0,
    );
    TestValidator.predicate(
      `announcement ${announcement.id} has valid status`,
      ["active", "scheduled", "expired", "retracted"].includes(
        announcement.status,
      ),
    );
  });
}
