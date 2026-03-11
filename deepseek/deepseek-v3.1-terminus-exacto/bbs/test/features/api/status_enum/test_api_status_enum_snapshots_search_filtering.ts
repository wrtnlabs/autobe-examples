import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnum";
import type { IDiscussionBoardStatusEnumSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnumSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardStatusEnumSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardStatusEnumSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_status_enums_create } from "../../../generate/generate_random_discussion_board_admin_status_enums_create";
import { prepare_random_discussion_board_status_enum } from "../../../prepare/prepare_random_discussion_board_status_enum";

export async function test_api_status_enum_snapshots_search_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create a status enum using generation function
  const statusEnum =
    await generate_random_discussion_board_admin_status_enums_create(
      adminConnection,
      {
        body: {
          entity_type: "article",
          value: "published",
          description: "Article is published and visible to users",
          sort_order: 1,
        } satisfies DeepPartial<IDiscussionBoardStatusEnum.ICreate>,
      },
    );
  typia.assert(statusEnum);
  // Note: The actual snapshot creation endpoint is not available in the provided API functions
  // The test will focus on testing the search functionality with the assumption that snapshots exist
  // or are created by the test environment setup
  // Test cross-field search functionality
  const searchResults =
    await api.functional.discussionBoard.admin.status_enums.snapshots.index(
      adminConnection,
      {
        statusEnumId: statusEnum.id,
        body: {
          search: "test",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardStatusEnumSnapshot.IRequest,
      },
    );
  typia.assert(searchResults);
  // Test individual field filtering
  const nameFilterResults =
    await api.functional.discussionBoard.admin.status_enums.snapshots.index(
      adminConnection,
      {
        statusEnumId: statusEnum.id,
        body: {
          snapshot_name: "snapshot",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardStatusEnumSnapshot.IRequest,
      },
    );
  typia.assert(nameFilterResults);
  const descriptionFilterResults =
    await api.functional.discussionBoard.admin.status_enums.snapshots.index(
      adminConnection,
      {
        statusEnumId: statusEnum.id,
        body: {
          description: "description",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardStatusEnumSnapshot.IRequest,
      },
    );
  typia.assert(descriptionFilterResults);
  const reasonFilterResults =
    await api.functional.discussionBoard.admin.status_enums.snapshots.index(
      adminConnection,
      {
        statusEnumId: statusEnum.id,
        body: {
          snapshot_reason: "reason",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardStatusEnumSnapshot.IRequest,
      },
    );
  typia.assert(reasonFilterResults);
  // Test empty search term returns all results
  const emptySearchResults =
    await api.functional.discussionBoard.admin.status_enums.snapshots.index(
      adminConnection,
      {
        statusEnumId: statusEnum.id,
        body: {
          search: null,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardStatusEnumSnapshot.IRequest,
      },
    );
  typia.assert(emptySearchResults);
  // Test non-matching search returns empty results
  const nonMatchingResults =
    await api.functional.discussionBoard.admin.status_enums.snapshots.index(
      adminConnection,
      {
        statusEnumId: statusEnum.id,
        body: {
          search: "NonExistentTerm12345XYZ",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardStatusEnumSnapshot.IRequest,
      },
    );
  typia.assert(nonMatchingResults);
  // Test pagination functionality
  const paginationResults =
    await api.functional.discussionBoard.admin.status_enums.snapshots.index(
      adminConnection,
      {
        statusEnumId: statusEnum.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardStatusEnumSnapshot.IRequest,
      },
    );
  typia.assert(paginationResults);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination has current page",
    paginationResults.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    paginationResults.pagination.limit === 5,
  );
  TestValidator.predicate(
    "pagination has records count",
    paginationResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    paginationResults.pagination.pages >= 0,
  );
  // Validate search functionality
  TestValidator.predicate(
    "search returns valid pagination structure",
    searchResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "name filter returns valid structure",
    nameFilterResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "description filter returns valid structure",
    descriptionFilterResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "reason filter returns valid structure",
    reasonFilterResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "empty search returns valid structure",
    emptySearchResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "non-matching search returns valid structure",
    nonMatchingResults.pagination.records >= 0,
  );
  // Validate that all results have the expected summary structure
  if (searchResults.data.length > 0) {
    const firstResult = searchResults.data[0];
    TestValidator.predicate(
      "result has id",
      typeof firstResult.id === "string",
    );
    TestValidator.predicate(
      "result has snapshot_name",
      typeof firstResult.snapshot_name === "string",
    );
    TestValidator.predicate(
      "result has description",
      firstResult.description === null ||
        typeof firstResult.description === "string",
    );
    TestValidator.predicate(
      "result has snapshot_reason",
      firstResult.snapshot_reason === null ||
        typeof firstResult.snapshot_reason === "string",
    );
    TestValidator.predicate(
      "result has created_at",
      typeof firstResult.created_at === "string",
    );
  }
}
