import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnum";
import type { IDiscussionBoardStatusEnumSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnumSnapshot";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardStatusEnumSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardStatusEnumSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_status_enums_create } from "../../../generate/generate_random_discussion_board_super_admin_status_enums_create";
import { prepare_random_discussion_board_status_enum } from "../../../prepare/prepare_random_discussion_board_status_enum";

/**
 * Test pagination behavior when retrieving large sets of status enumeration snapshots.
 * This test validates pagination functionality for status enum snapshots retrieval.
 */
export async function test_api_status_enum_snapshots_pagination_large_set(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Create comment status enum as foundation
  const statusEnum =
    await generate_random_discussion_board_super_admin_status_enums_create(
      superAdminConnection,
      {
        body: {
          entity_type: "comment",
          value: "pending",
          description: "Comment is pending approval",
          sort_order: 1,
        } satisfies IDiscussionBoardStatusEnum.ICreate,
      },
    );
  typia.assert(statusEnum);
  // Note: Since there's no API function to create snapshots,
  // we can only test the pagination retrieval functionality
  // with whatever snapshots might already exist in the system
  // 3. Test pagination functionality with default parameters
  const defaultResponse =
    await api.functional.discussionBoard.superAdmin.status_enums.snapshots.index(
      superAdminConnection,
      {
        statusEnumId: statusEnum.id,
        body: {} satisfies IDiscussionBoardStatusEnumSnapshot.IRequest,
      },
    );
  typia.assert(defaultResponse);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination should have current page",
    defaultResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination should have limit",
    defaultResponse.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination should have total records",
    defaultResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination should have total pages",
    defaultResponse.pagination.pages >= 0,
  );
  // 4. Test pagination with explicit page and limit
  const explicitResponse =
    await api.functional.discussionBoard.superAdmin.status_enums.snapshots.index(
      superAdminConnection,
      {
        statusEnumId: statusEnum.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardStatusEnumSnapshot.IRequest,
      },
    );
  typia.assert(explicitResponse);
  // Validate explicit pagination parameters
  TestValidator.equals(
    "explicit page should be respected",
    explicitResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "explicit limit should be respected",
    explicitResponse.pagination.limit,
    10,
  );
  // 5. Test edge case: page beyond available pages
  const beyondPageResponse =
    await api.functional.discussionBoard.superAdmin.status_enums.snapshots.index(
      superAdminConnection,
      {
        statusEnumId: statusEnum.id,
        body: {
          page: 1000,
          limit: 10,
        } satisfies IDiscussionBoardStatusEnumSnapshot.IRequest,
      },
    );
  typia.assert(beyondPageResponse);
  // Beyond page should return empty data array but valid pagination metadata
  TestValidator.predicate(
    "beyond page should have valid pagination structure",
    beyondPageResponse.pagination.current === 1000 &&
      beyondPageResponse.pagination.limit === 10 &&
      beyondPageResponse.pagination.records >= 0 &&
      beyondPageResponse.pagination.pages >= 0,
  );
  // 6. Test limit boundaries
  const minLimitResponse =
    await api.functional.discussionBoard.superAdmin.status_enums.snapshots.index(
      superAdminConnection,
      {
        statusEnumId: statusEnum.id,
        body: {
          page: 1,
          limit: 1,
        } satisfies IDiscussionBoardStatusEnumSnapshot.IRequest,
      },
    );
  typia.assert(minLimitResponse);
  const maxLimitResponse =
    await api.functional.discussionBoard.superAdmin.status_enums.snapshots.index(
      superAdminConnection,
      {
        statusEnumId: statusEnum.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardStatusEnumSnapshot.IRequest,
      },
    );
  typia.assert(maxLimitResponse);
  // Validate limit boundaries are respected
  TestValidator.equals(
    "min limit should be respected",
    minLimitResponse.pagination.limit,
    1,
  );
  TestValidator.equals(
    "max limit should be respected",
    maxLimitResponse.pagination.limit,
    100,
  );
  // 7. Validate response data structure
  if (defaultResponse.data.length > 0) {
    const snapshot = defaultResponse.data[0];
    TestValidator.predicate(
      "snapshot should have id",
      typeof snapshot.id === "string",
    );
    TestValidator.predicate(
      "snapshot should have name",
      typeof snapshot.snapshot_name === "string",
    );
    TestValidator.predicate(
      "snapshot should have created_at",
      typeof snapshot.created_at === "string",
    );
  }
}
