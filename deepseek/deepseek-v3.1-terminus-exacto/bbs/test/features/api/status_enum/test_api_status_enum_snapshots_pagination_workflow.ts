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

/**
 * Test pagination functionality for status enum snapshots.
 *
 * Tests pagination behavior by querying existing snapshots with different
 * page/limit parameters and validates pagination metadata accuracy.
 */
export async function test_api_status_enum_snapshots_pagination_workflow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator connection and register admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create a status enumeration
  const statusEnum =
    await generate_random_discussion_board_admin_status_enums_create(
      adminConnection,
      {
        body: {
          entity_type: "article",
          value: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          sort_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IDiscussionBoardStatusEnum.ICreate,
      },
    );
  typia.assert(statusEnum);
  // 3. Test pagination with different configurations
  // We'll test various page/limit combinations to verify pagination works correctly
  const testCases = [
    { page: 1, limit: 10 }, // First page, default limit
    { page: 2, limit: 10 }, // Second page
    { page: 3, limit: 5 }, // Third page with smaller limit
    { page: 1, limit: 100 }, // Large limit (should cap at max)
    { page: 10, limit: 5 }, // Page beyond available data
    { page: undefined, limit: undefined }, // Default pagination
  ];
  for (const testCase of testCases) {
    const requestBody: IDiscussionBoardStatusEnumSnapshot.IRequest = {
      page: testCase.page,
      limit: testCase.limit,
    };
    const response =
      await api.functional.discussionBoard.admin.status_enums.snapshots.index(
        adminConnection,
        {
          statusEnumId: statusEnum.id,
          body: requestBody,
        },
      );
    typia.assert(response);
    // Validate pagination metadata
    TestValidator.predicate(
      `pagination metadata exists for page ${testCase.page ?? "default"} limit ${testCase.limit ?? "default"}`,
      response.pagination !== undefined,
    );
    TestValidator.equals(
      `current page matches for page ${testCase.page ?? "default"}`,
      response.pagination.current,
      testCase.page ?? 1,
    );
    TestValidator.equals(
      `limit matches for limit ${testCase.limit ?? "default"}`,
      response.pagination.limit,
      testCase.limit ? Math.min(testCase.limit, 100) : 20,
    );
    TestValidator.predicate(
      `total records is non-negative for page ${testCase.page ?? "default"}`,
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      `total pages is non-negative for page ${testCase.page ?? "default"}`,
      response.pagination.pages >= 0,
    );
    // Validate data array size doesn't exceed limit
    TestValidator.predicate(
      `data array size <= limit for page ${testCase.page ?? "default"}`,
      response.data.length <= response.pagination.limit,
    );
    // Validate each snapshot summary has required fields
    for (const snapshot of response.data) {
      typia.assert(snapshot);
      TestValidator.predicate(
        `snapshot has id for page ${testCase.page ?? "default"}`,
        typeof snapshot.id === "string" && snapshot.id.length > 0,
      );
      TestValidator.predicate(
        `snapshot has name for page ${testCase.page ?? "default"}`,
        typeof snapshot.snapshot_name === "string" &&
          snapshot.snapshot_name.length > 0,
      );
      TestValidator.predicate(
        `snapshot has creation date for page ${testCase.page ?? "default"}`,
        typeof snapshot.created_at === "string" &&
          snapshot.created_at.length > 0,
      );
    }
  }
  // 4. Test search functionality with pagination
  const searchResponse =
    await api.functional.discussionBoard.admin.status_enums.snapshots.index(
      adminConnection,
      {
        statusEnumId: statusEnum.id,
        body: {
          search: "snapshot",
          page: 1,
          limit: 15,
        } satisfies IDiscussionBoardStatusEnumSnapshot.IRequest,
      },
    );
  typia.assert(searchResponse);
  TestValidator.predicate(
    "search returns valid pagination",
    searchResponse.pagination.records >= 0,
  );
  // 5. Test that pagination metadata calculations are correct
  // pages = ceil(records / limit)
  const metadataTest =
    await api.functional.discussionBoard.admin.status_enums.snapshots.index(
      adminConnection,
      {
        statusEnumId: statusEnum.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardStatusEnumSnapshot.IRequest,
      },
    );
  typia.assert(metadataTest);
  const expectedPages = Math.ceil(
    metadataTest.pagination.records / metadataTest.pagination.limit,
  );
  TestValidator.equals(
    "pagination pages calculation is correct",
    metadataTest.pagination.pages,
    expectedPages,
  );
}
