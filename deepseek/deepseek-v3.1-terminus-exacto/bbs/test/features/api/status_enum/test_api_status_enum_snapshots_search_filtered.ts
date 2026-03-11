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

export async function test_api_status_enum_snapshots_search_filtered(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create a status enum for testing
  const statusEnum =
    await generate_random_discussion_board_super_admin_status_enums_create(
      superAdminConnection,
      {
        body: {
          entity_type: "article",
          value: "draft",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          sort_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IDiscussionBoardStatusEnum.ICreate,
      },
    );
  typia.assert(statusEnum);
  // Test search functionality with various filter combinations
  // Since snapshot creation is not available, we test the search endpoint with different parameters
  // Test 1: Search with empty criteria
  const emptySearch =
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
  typia.assert(emptySearch);
  // Test 2: Search with specific criteria (even if no snapshots exist)
  const searchWithCriteria =
    await api.functional.discussionBoard.superAdmin.status_enums.snapshots.index(
      superAdminConnection,
      {
        statusEnumId: statusEnum.id,
        body: {
          search: "audit",
          snapshot_name: "config",
          description: "compliance",
          snapshot_reason: "review",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardStatusEnumSnapshot.IRequest,
      },
    );
  typia.assert(searchWithCriteria);
  // Test 3: Verify pagination metadata structure
  TestValidator.equals(
    "pagination current page",
    emptySearch.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    emptySearch.pagination.limit > 0 && emptySearch.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    emptySearch.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    emptySearch.pagination.pages >= 0,
  );
  // Test 4: Verify response data structure
  if (emptySearch.data.length > 0) {
    const sampleSnapshot = emptySearch.data[0];
    TestValidator.predicate(
      "snapshot has valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        sampleSnapshot.id,
      ),
    );
    TestValidator.predicate(
      "snapshot has name field",
      typeof sampleSnapshot.snapshot_name === "string",
    );
    TestValidator.predicate(
      "snapshot has valid created_at timestamp",
      typeof sampleSnapshot.created_at === "string" &&
        sampleSnapshot.created_at.length > 0,
    );
  }
  // Test 5: Verify that search returns data specific to the status enum ID
  // Create another status enum to test isolation
  const otherStatusEnum =
    await generate_random_discussion_board_super_admin_status_enums_create(
      superAdminConnection,
      {
        body: {
          entity_type: "comment",
          value: "pending",
          description: "Comment pending status",
          sort_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IDiscussionBoardStatusEnum.ICreate,
      },
    );
  typia.assert(otherStatusEnum);
  const otherSearch =
    await api.functional.discussionBoard.superAdmin.status_enums.snapshots.index(
      superAdminConnection,
      {
        statusEnumId: otherStatusEnum.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardStatusEnumSnapshot.IRequest,
      },
    );
  typia.assert(otherSearch);
  // The search should work without errors even if no snapshots exist
  TestValidator.predicate(
    "search returns valid pagination for other status enum",
    otherSearch.pagination.current === 1 && otherSearch.pagination.limit === 10,
  );
}
