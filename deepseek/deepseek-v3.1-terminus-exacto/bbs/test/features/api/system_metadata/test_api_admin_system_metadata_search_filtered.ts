import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSystemMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemMetadatum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSystemMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemMetadatum";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test advanced filtering capabilities of the system metadata search.
 * Validate that admins can filter configurations by name (partial matching),
 * scope (exact matching), data type, and status. Test combinations of filters
 * to ensure they work correctly together. Verify that partial name matching
 * returns relevant results and exact scope filtering returns only configurations
 * within the specified scope. Test edge cases like empty search results and
 * invalid filter combinations.
 */
export async function test_api_admin_system_metadata_search_filtered(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection using authorize_admin_join utility
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Test 1: Search with partial name matching
  const partialSearch = RandomGenerator.paragraph({ sentences: 1 }).substring(
    0,
    5,
  );
  const searchResult =
    await api.functional.discussionBoard.admin.system_metadata.index(
      adminConnection,
      {
        body: {
          search: partialSearch,
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardSystemMetadatum.IRequest,
      },
    );
  typia.assert(searchResult);
  TestValidator.predicate(
    "search returns paginated response",
    searchResult.data.length >= 0 &&
      typeof searchResult.pagination.current === "number" &&
      typeof searchResult.pagination.limit === "number" &&
      typeof searchResult.pagination.records === "number" &&
      typeof searchResult.pagination.pages === "number",
  );
  // Test 2: Exact scope filtering
  if (searchResult.data.length > 0) {
    const sampleScope = searchResult.data[0]!.scope;
    const scopeResult =
      await api.functional.discussionBoard.admin.system_metadata.index(
        adminConnection,
        {
          body: {
            scope: sampleScope,
            page: 1 satisfies number as number,
            limit: 10 satisfies number as number,
          } satisfies IDiscussionBoardSystemMetadatum.IRequest,
        },
      );
    typia.assert(scopeResult);
    TestValidator.predicate(
      "scope filtered results match scope",
      scopeResult.data.every((item) => item.scope === sampleScope),
    );
  }
  // Test 3: Data type filtering
  if (searchResult.data.length > 0) {
    const sampleDataType = searchResult.data[0]!.data_type;
    const dataTypeResult =
      await api.functional.discussionBoard.admin.system_metadata.index(
        adminConnection,
        {
          body: {
            data_type: sampleDataType,
            page: 1 satisfies number as number,
            limit: 10 satisfies number as number,
          } satisfies IDiscussionBoardSystemMetadatum.IRequest,
        },
      );
    typia.assert(dataTypeResult);
    TestValidator.predicate(
      "data type filtered results match data type",
      dataTypeResult.data.every((item) => item.data_type === sampleDataType),
    );
  }
  // Test 4: Empty search results (random non-matching search term)
  const randomTerm = RandomGenerator.alphabets(20);
  const emptyResult =
    await api.functional.discussionBoard.admin.system_metadata.index(
      adminConnection,
      {
        body: {
          search: randomTerm,
          page: 1 satisfies number as number,
          limit: 10 satisfies number as number,
        } satisfies IDiscussionBoardSystemMetadatum.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty search returns zero records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search returns empty data array",
    emptyResult.data.length,
    0,
  );
  // Test 5: Multi-filter combination
  if (searchResult.data.length > 0) {
    const sampleItem = searchResult.data[0]!;
    const combinedResult =
      await api.functional.discussionBoard.admin.system_metadata.index(
        adminConnection,
        {
          body: {
            search: sampleItem.name.substring(0, 3),
            scope: sampleItem.scope,
            data_type: sampleItem.data_type,
            page: 1 satisfies number as number,
            limit: 10 satisfies number as number,
          } satisfies IDiscussionBoardSystemMetadatum.IRequest,
        },
      );
    typia.assert(combinedResult);
    TestValidator.predicate(
      "combined filter results match all criteria",
      combinedResult.data.every(
        (item) =>
          item.name.includes(sampleItem.name.substring(0, 3)) &&
          item.scope === sampleItem.scope &&
          item.data_type === sampleItem.data_type,
      ),
    );
  }
  // Test 6: Status type filtering (if status_type_id available in data)
  if (searchResult.data.length > 0 && searchResult.data[0]!.status_type_id) {
    const sampleStatusId = searchResult.data[0]!.status_type_id;
    const statusResult =
      await api.functional.discussionBoard.admin.system_metadata.index(
        adminConnection,
        {
          body: {
            status_type_id: sampleStatusId,
            page: 1 satisfies number as number,
            limit: 10 satisfies number as number,
          } satisfies IDiscussionBoardSystemMetadatum.IRequest,
        },
      );
    typia.assert(statusResult);
    TestValidator.predicate(
      "status type filtered results match status type id",
      statusResult.data.every((item) => item.status_type_id === sampleStatusId),
    );
  }
}
