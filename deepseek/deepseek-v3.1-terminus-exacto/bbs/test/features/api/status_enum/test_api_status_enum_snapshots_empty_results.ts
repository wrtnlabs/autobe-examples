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
 * Test proper handling when status enumeration exists but has no snapshots,
 * or when search filters produce no matches.
 */
export async function test_api_status_enum_snapshots_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator session
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Create admin request status enum for testing
  const statusEnum =
    await generate_random_discussion_board_super_admin_status_enums_create(
      superAdminConnection,
      {
        body: {
          entity_type: "admin_request",
          value: "approved",
          description: "Admin request has been approved",
          sort_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IDiscussionBoardStatusEnum.ICreate,
      },
    );
  typia.assert(statusEnum);
  // 3. Test empty snapshots scenario (no snapshots exist)
  const emptySnapshotsResponse =
    await api.functional.discussionBoard.superAdmin.status_enums.snapshots.index(
      superAdminConnection,
      {
        statusEnumId: statusEnum.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardStatusEnumSnapshot.IRequest,
      },
    );
  typia.assert(emptySnapshotsResponse);
  // 4. Validate empty pagination metadata
  TestValidator.equals(
    "empty snapshots data array",
    emptySnapshotsResponse.data,
    [],
  );
  TestValidator.equals(
    "empty snapshots records count",
    emptySnapshotsResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty snapshots pages count",
    emptySnapshotsResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty snapshots current page",
    emptySnapshotsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty snapshots limit",
    emptySnapshotsResponse.pagination.limit,
    20,
  );
  // 5. Search for non-matching criteria (snapshots exist but don't match filters)
  const nonMatchingSearchResponse =
    await api.functional.discussionBoard.superAdmin.status_enums.snapshots.index(
      superAdminConnection,
      {
        statusEnumId: statusEnum.id,
        body: {
          search: "nonexistent",
          snapshot_name: "missing",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardStatusEnumSnapshot.IRequest,
      },
    );
  typia.assert(nonMatchingSearchResponse);
  // 6. Confirm empty results with proper pagination
  TestValidator.equals(
    "non-matching search data array",
    nonMatchingSearchResponse.data,
    [],
  );
  TestValidator.equals(
    "non-matching search records count",
    nonMatchingSearchResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-matching search pages count",
    nonMatchingSearchResponse.pagination.pages,
    0,
  );
  // 7. Test filtering by description with no matches
  const nonMatchingDescriptionResponse =
    await api.functional.discussionBoard.superAdmin.status_enums.snapshots.index(
      superAdminConnection,
      {
        statusEnumId: statusEnum.id,
        body: {
          description: "completely different description",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardStatusEnumSnapshot.IRequest,
      },
    );
  typia.assert(nonMatchingDescriptionResponse);
  TestValidator.equals(
    "non-matching description data array",
    nonMatchingDescriptionResponse.data,
    [],
  );
  TestValidator.equals(
    "non-matching description records count",
    nonMatchingDescriptionResponse.pagination.records,
    0,
  );
  // 8. Validate system returns consistent empty results with proper pagination
  TestValidator.predicate(
    "all empty scenarios return zero records",
    emptySnapshotsResponse.pagination.records === 0 &&
      nonMatchingSearchResponse.pagination.records === 0 &&
      nonMatchingDescriptionResponse.pagination.records === 0,
  );
}
