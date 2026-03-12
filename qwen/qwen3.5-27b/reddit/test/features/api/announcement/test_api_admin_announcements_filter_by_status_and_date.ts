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

export async function test_api_admin_announcements_filter_by_status_and_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
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
    },
  });
  // 2. Query announcements with status filter
  const statusFiltered =
    await api.functional.redditClone.admin.announcements.index(
      adminConnection,
      {
        body: {
          status: "active",
          page: 1,
          limit: 20,
        } satisfies IRedditCloneAnnouncement.IRequest,
      },
    );
  typia.assert(statusFiltered);
  TestValidator.equals(
    "status filter pagination current",
    statusFiltered.pagination.current,
    1,
  );
  TestValidator.predicate(
    "status filter has valid limit",
    statusFiltered.pagination.limit > 0,
  );
  // 3. Query announcements with target audience filter
  const audienceFiltered =
    await api.functional.redditClone.admin.announcements.index(
      adminConnection,
      {
        body: {
          targetAudience: "all",
          page: 1,
          limit: 10,
        } satisfies IRedditCloneAnnouncement.IRequest,
      },
    );
  typia.assert(audienceFiltered);
  TestValidator.equals(
    "audience filter limit",
    audienceFiltered.pagination.limit,
    10,
  );
  // 4. Query announcements with date range filter
  const now = new Date();
  const startDate = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days ago
  const endDate = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days future
  const dateFiltered =
    await api.functional.redditClone.admin.announcements.index(
      adminConnection,
      {
        body: {
          startDate: startDate,
          endDate: endDate,
          page: 1,
          limit: 15,
        } satisfies IRedditCloneAnnouncement.IRequest,
      },
    );
  typia.assert(dateFiltered);
  TestValidator.predicate(
    "date filter returns valid pagination",
    dateFiltered.pagination.pages >= 0,
  );
  // 5. Query announcements with delivery status filter
  const deliveryFiltered =
    await api.functional.redditClone.admin.announcements.index(
      adminConnection,
      {
        body: {
          deliveryStatus: "delivered",
          page: 1,
          limit: 20,
        } satisfies IRedditCloneAnnouncement.IRequest,
      },
    );
  typia.assert(deliveryFiltered);
  TestValidator.equals(
    "delivery filter current page",
    deliveryFiltered.pagination.current,
    1,
  );
  // 6. Query announcements with search filter
  const searchKeyword = RandomGenerator.alphabets(5);
  const searchFiltered =
    await api.functional.redditClone.admin.announcements.index(
      adminConnection,
      {
        body: {
          search: searchKeyword,
          page: 1,
          limit: 20,
        } satisfies IRedditCloneAnnouncement.IRequest,
      },
    );
  typia.assert(searchFiltered);
  TestValidator.predicate(
    "search returns valid response",
    searchFiltered.pagination.records >= 0,
  );
  // 7. Query announcements with sorting
  const sortedByCreated =
    await api.functional.redditClone.admin.announcements.index(
      adminConnection,
      {
        body: {
          sortBy: "createdAt",
          sortOrder: "desc",
          page: 1,
          limit: 20,
        } satisfies IRedditCloneAnnouncement.IRequest,
      },
    );
  typia.assert(sortedByCreated);
  TestValidator.equals(
    "sort by createdAt page",
    sortedByCreated.pagination.current,
    1,
  );
  // 8. Query announcements with multiple filters combined
  const combinedFiltered =
    await api.functional.redditClone.admin.announcements.index(
      adminConnection,
      {
        body: {
          status: "scheduled",
          targetAudience: "community",
          deliveryStatus: "pending",
          sortBy: "scheduledAt",
          sortOrder: "asc",
          page: 1,
          limit: 25,
        } satisfies IRedditCloneAnnouncement.IRequest,
      },
    );
  typia.assert(combinedFiltered);
  TestValidator.equals(
    "combined filter limit",
    combinedFiltered.pagination.limit,
    25,
  );
  // 9. Test pagination - request page 2
  const page2Result =
    await api.functional.redditClone.admin.announcements.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IRedditCloneAnnouncement.IRequest,
      },
    );
  typia.assert(page2Result);
  TestValidator.equals("page 2 current", page2Result.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2Result.pagination.limit, 10);
  // 10. Verify announcement summary structure when data exists
  if (statusFiltered.data.length > 0) {
    const firstAnnouncement = statusFiltered.data[0];
    TestValidator.predicate(
      "announcement has valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstAnnouncement.id,
      ),
    );
    TestValidator.predicate(
      "announcement has title",
      firstAnnouncement.title.length > 0,
    );
    TestValidator.predicate(
      "announcement has status",
      ["active", "scheduled", "expired", "retracted"].includes(
        firstAnnouncement.status,
      ),
    );
    TestValidator.predicate(
      "announcement has valid createdAt",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
        firstAnnouncement.createdAt,
      ),
    );
    TestValidator.predicate(
      "announcement has valid updatedAt",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
        firstAnnouncement.updatedAt,
      ),
    );
  }
  // 11. Verify pagination metadata consistency
  TestValidator.predicate(
    "pagination records non-negative",
    statusFiltered.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    statusFiltered.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination current page valid",
    statusFiltered.pagination.current >= 1,
  );
}
