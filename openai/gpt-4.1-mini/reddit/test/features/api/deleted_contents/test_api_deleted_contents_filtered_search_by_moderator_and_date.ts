import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformDeletedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDeletedContent";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformDeletedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformDeletedContent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_deleted_contents_filtered_search_by_moderator_and_date(
  connection: api.IConnection,
): Promise<void> {
  // Setup admin actor
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAccount = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAccount);
  // Sanity check: unauthorized access fails
  await TestValidator.error("unauthorized access is rejected", async () => {
    await api.functional.communityPlatform.admin.deleted_contents.index(
      connection,
      {
        body: {},
      },
    );
  });
  // Prepare data for testing filtering:
  // We must assume these deleted contents exist or simulate their presence with different moderator IDs and creation dates.
  // Since there's no generation utility, we only test filtering with random valid or invalid data.
  // Generate filter criteria: use the moderator ID from the admin who joined,
  // and a date range covering the last 7 days
  const moderatorId = adminAccount.id;
  const today = new Date();
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const createdAfter = sevenDaysAgo.toISOString();
  const createdBefore = today.toISOString();
  // Call with filter: moderator_id and createdAfter/createdBefore range, page and limit
  const page = 1;
  const limit = 10;
  const filteredResponse =
    await api.functional.communityPlatform.admin.deleted_contents.index(
      adminConnection,
      {
        body: {
          moderator_id: moderatorId,
          createdAfter: createdAfter,
          createdBefore: createdBefore,
          page: page,
          limit: limit,
        },
      },
    );
  typia.assert(filteredResponse);
  // Validate pagination properties
  TestValidator.predicate(
    "valid current page",
    filteredResponse.pagination.current === page,
  );
  TestValidator.predicate(
    "valid limit",
    filteredResponse.pagination.limit === limit,
  );
  TestValidator.predicate(
    "valid page count",
    filteredResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "valid record count",
    filteredResponse.pagination.records >= 0,
  );
  // Validate all deleted content items correspond to moderator_id and createdAt in range
  filteredResponse.data.forEach((item) => {
    typia.assert(item);
    TestValidator.equals(
      "filter by moderator_id",
      item.moderatorId,
      moderatorId,
    );
    TestValidator.predicate(
      "createdAfter filter",
      item.createdAt >= createdAfter,
    );
    TestValidator.predicate(
      "createdBefore filter",
      item.createdAt <= createdBefore,
    );
  });
  // Test invalid filter input: invalid UUID for moderator_id
  await TestValidator.error("invalid moderator_id format", async () => {
    await api.functional.communityPlatform.admin.deleted_contents.index(
      adminConnection,
      {
        body: {
          moderator_id: "invalid-uuid-format",
        },
      },
    );
  });
  // Test invalid date format for createdAfter
  await TestValidator.error("invalid createdAfter format", async () => {
    await api.functional.communityPlatform.admin.deleted_contents.index(
      adminConnection,
      {
        body: {
          createdAfter: "2024-99-99T99:99:99Z",
        },
      },
    );
  });
  // Test invalid date format for createdBefore
  await TestValidator.error("invalid createdBefore format", async () => {
    await api.functional.communityPlatform.admin.deleted_contents.index(
      adminConnection,
      {
        body: {
          createdBefore: "not-a-date",
        },
      },
    );
  });
}
