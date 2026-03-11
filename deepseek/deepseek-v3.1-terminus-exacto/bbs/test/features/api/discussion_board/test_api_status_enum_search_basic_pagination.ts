import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardStatusEnum";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test the basic functionality of searching status enumeration values with pagination.
 * Verify that administrators can retrieve a paginated list of status values without any filters applied.
 * Validate that the response includes proper pagination metadata (current page, limit, total records, total pages)
 * and that the data array contains status enumeration summaries with required fields.
 * Ensure the default sorting follows the sort_order field as specified in the operation description.
 */
export async function test_api_status_enum_search_basic_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Search status enumerations without filters (basic pagination test)
  const searchRequest = {
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardStatusEnum.IRequest;
  const response =
    await api.functional.discussionBoard.admin.status_enums.index(
      adminConnection,
      { body: searchRequest },
    );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "pagination object exists",
    typeof response.pagination,
    "object",
  );
  TestValidator.predicate(
    "current page is 1",
    response.pagination.current === 1,
  );
  TestValidator.predicate("limit is 10", response.pagination.limit === 10);
  TestValidator.predicate(
    "records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    response.pagination.pages >= 0,
  );
  // 4. Validate data structure for each status enum summary
  if (response.data.length > 0) {
    for (const statusEnum of response.data) {
      TestValidator.predicate(
        "has id field",
        typeof statusEnum.id === "string",
      );
      TestValidator.predicate(
        "has entity_type field",
        typeof statusEnum.entity_type === "string",
      );
      TestValidator.predicate(
        "has value field",
        typeof statusEnum.value === "string",
      );
      TestValidator.predicate(
        "has description field",
        typeof statusEnum.description === "string",
      );
      TestValidator.predicate(
        "has sort_order field",
        typeof statusEnum.sort_order === "number",
      );
      TestValidator.predicate(
        "has is_active field",
        typeof statusEnum.is_active === "boolean",
      );
    }
    // 5. Validate default sorting by sort_order (ascending)
    for (let i = 1; i < response.data.length; i++) {
      TestValidator.predicate(
        `sort_order ${i - 1} <= sort_order ${i}`,
        response.data[i - 1].sort_order <= response.data[i].sort_order,
      );
    }
  }
}
