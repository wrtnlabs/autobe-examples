import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemActivity";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import type { IPageIDiscussionBoardSystemActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemActivity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_system_activity_empty_filters_with_pagination_limits(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Test 1: Empty filters with default pagination
  const emptyFilters: IDiscussionBoardSystemActivity.IRequest = {
    activity_type: null,
    target_entity_type: null,
    target_entity_id: null,
    success_status: null,
    user_id: null,
    admin_id: null,
    super_admin_id: null,
    created_at_from: null,
    created_at_to: null,
    search: null,
  } satisfies IDiscussionBoardSystemActivity.IRequest;
  const page1 =
    await api.functional.discussionBoard.admin.system_activities.index(
      adminConnection,
      { body: emptyFilters },
    );
  typia.assert(page1);
  // Validate default pagination
  TestValidator.equals("default page is 1", (page1.pagination as any).current, 1);
  TestValidator.predicate("limit is at most 10", (page1.pagination as any).limit <= 10);
  TestValidator.predicate(
    "total pages is non-negative",
    (page1.pagination as any).pages >= 0,
  );
  TestValidator.predicate(
    "total records is non-negative",
    (page1.pagination as any).records >= 0,
  );
  // Test 2: Large page number beyond total pages
  const largePageRequest: IDiscussionBoardSystemActivity.IRequest = {
    ...emptyFilters,
    page: 999999 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100> as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IDiscussionBoardSystemActivity.IRequest;
  const largePageResult =
    await api.functional.discussionBoard.admin.system_activities.index(
      adminConnection,
      { body: largePageRequest },
    );
  typia.assert(largePageResult);
  TestValidator.predicate(
    "large page returns empty data",
    largePageResult.data.length === 0,
  );
  TestValidator.equals(
    "current page matches request",
    (largePageResult.pagination as any).current,
    largePageRequest.page,
  );
  TestValidator.predicate(
    "page beyond total still has valid total pages",
    (largePageResult.pagination as any).pages >= 0,
  );
  // Test 3: Valid limit boundaries
  // Test limit=1
  const limit1Request: IDiscussionBoardSystemActivity.IRequest = {
    ...emptyFilters,
    limit: 1 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100> as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IDiscussionBoardSystemActivity.IRequest;
  const limit1Result =
    await api.functional.discussionBoard.admin.system_activities.index(
      adminConnection,
      { body: limit1Request },
    );
  typia.assert(limit1Result);
  TestValidator.equals(
    "limit requests limit",
    (limit1Result.pagination as any).limit,
    1,
  );
  TestValidator.predicate(
    "data length matches limit",
    limit1Result.data.length <= 1,
  );
  // Test limit=100 (maximum allowed)
  const limit100Request: IDiscussionBoardSystemActivity.IRequest = {
    ...emptyFilters,
    limit: 100 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100> as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IDiscussionBoardSystemActivity.IRequest;
  const limit100Result =
    await api.functional.discussionBoard.admin.system_activities.index(
      adminConnection,
      { body: limit100Request },
    );
  typia.assert(limit100Result);
  TestValidator.equals(
    "maximum limit is 100",
    (limit100Result.pagination as any).limit,
    100,
  );
  TestValidator.predicate(
    "data length respects maximum limit",
    limit100Result.data.length <= 100,
  );
  // Test 4: Validate ordering consistency (only if enough data exists)
  if (limit100Result.data.length > 1) {
    TestValidator.predicate(
      "activities are ordered by created_at descending",
      () => {
        for (let i = 0; i < limit100Result.data.length - 1; i++) {
          const currentTime = new Date(
            limit100Result.data[i]!.created_at,
          ).getTime();
          const nextTime = new Date(
            limit100Result.data[i + 1]!.created_at,
          ).getTime();
          if (currentTime < nextTime) return false; // Should be descending
        }
        return true;
      },
    );
  }
  // Test 5: Verify pagination metadata calculation
  if (
    (limit100Result.pagination as any).records > 0 &&
    (limit100Result.pagination as any).limit > 0
  ) {
    const expectedPages = Math.ceil(
      (limit100Result.pagination as any).records / (limit100Result.pagination as any).limit,
    );
    TestValidator.equals(
      "total pages calculated correctly",
      (limit100Result.pagination as any).pages,
      expectedPages,
    );
  }
}