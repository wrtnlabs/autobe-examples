import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnum";
import type { IDiscussionBoardStatusEnumReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnumReference";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardStatusEnumReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardStatusEnumReference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_status_enum_references_search_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Since we cannot create status enums (no creation endpoint provided),
  // we'll use the search functionality to discover existing status enums first
  // and then perform targeted filtering on one of them
  // First, get a list of status enums by performing a broad search
  const initialSearch =
    await api.functional.discussionBoard.admin.status_enums.references.index(
      adminConnection,
      {
        statusEnumId: typia.random<string & tags.Format<"uuid">>(), // Use a random ID to see what exists
        body: {
          limit: 1,
        } satisfies IDiscussionBoardStatusEnumReference.IRequest,
      },
    );
  // If we get results, use the first status enum ID for our targeted search
  // If no results, we'll use a realistic approach with search term filtering
  const targetStatusEnumId =
    initialSearch.data.length > 0
      ? initialSearch.data[0].statusEnum.id
      : typia.random<string & tags.Format<"uuid">>();
  // 3. Perform targeted search with filters
  const createdAfterDate = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 30 days ago
  const searchResponse =
    await api.functional.discussionBoard.admin.status_enums.references.index(
      adminConnection,
      {
        statusEnumId: targetStatusEnumId,
        body: {
          search: "discussion_board", // Broader search term to increase chances of matches
          created_after: createdAfterDate,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardStatusEnumReference.IRequest,
      },
    );
  typia.assert(searchResponse);
  // 4. Validate response structure and filtering
  TestValidator.equals(
    "response has pagination",
    typeof searchResponse.pagination,
    "object",
  );
  TestValidator.equals(
    "response has data array",
    Array.isArray(searchResponse.data),
    true,
  );
  // Validate pagination structure
  TestValidator.predicate(
    "pagination has current page",
    searchResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    searchResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records",
    searchResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    searchResponse.pagination.pages >= 0,
  );
  // Validate each reference record
  for (const reference of searchResponse.data) {
    typia.assert(reference);
    TestValidator.equals("reference has id", typeof reference.id, "string");
    TestValidator.equals(
      "reference has referenced_table",
      typeof reference.referenced_table,
      "string",
    );
    TestValidator.equals(
      "reference has referenced_column",
      typeof reference.referenced_column,
      "string",
    );
    TestValidator.equals(
      "reference has statusEnum",
      typeof reference.statusEnum,
      "object",
    );
    // Validate status enum structure
    TestValidator.equals(
      "statusEnum has id",
      typeof reference.statusEnum.id,
      "string",
    );
    TestValidator.equals(
      "statusEnum has entity_type",
      typeof reference.statusEnum.entity_type,
      "string",
    );
    TestValidator.equals(
      "statusEnum has value",
      typeof reference.statusEnum.value,
      "string",
    );
    TestValidator.equals(
      "statusEnum has description",
      typeof reference.statusEnum.description,
      "string",
    );
    TestValidator.equals(
      "statusEnum has sort_order",
      typeof reference.statusEnum.sort_order,
      "number",
    );
    TestValidator.equals(
      "statusEnum has is_active",
      typeof reference.statusEnum.is_active,
      "boolean",
    );
    // Validate the relationship to the target statusEnumId
    TestValidator.equals(
      "statusEnum ID matches",
      reference.statusEnum.id,
      targetStatusEnumId,
    );
    // Validate search term filtering (if search term was provided and we have results)
    if (searchResponse.data.length > 0) {
      TestValidator.predicate(
        "referenced_table contains search term",
        reference.referenced_table.toLowerCase().includes("discussion_board"),
      );
    }
  }
  // 5. Test additional search scenarios
  // Test with different search terms
  const alternativeSearch =
    await api.functional.discussionBoard.admin.status_enums.references.index(
      adminConnection,
      {
        statusEnumId: targetStatusEnumId,
        body: {
          search: "articles", // Different search term
          limit: 5,
        } satisfies IDiscussionBoardStatusEnumReference.IRequest,
      },
    );
  typia.assert(alternativeSearch);
  // Validate the alternative search also returns valid structure
  TestValidator.equals(
    "alternative response has pagination",
    typeof alternativeSearch.pagination,
    "object",
  );
  TestValidator.equals(
    "alternative response has data array",
    Array.isArray(alternativeSearch.data),
    true,
  );
}
