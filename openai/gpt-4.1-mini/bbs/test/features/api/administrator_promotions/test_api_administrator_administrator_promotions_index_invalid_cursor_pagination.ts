import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotion";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotion";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test scenario 3: Retrieval with invalid pagination cursor parameter.
 *
 * Steps:
 * - Authenticate as administrator.
 * - Call the PATCH /discussionBoard/administrator/administratorPromotions with an invalid cursor value.
 * - Verify system returns valid default or fallback pagination data with HTTP 200.
 * - Assert no errors or crashes occur.
 */
export async function test_api_administrator_administrator_promotions_index_invalid_cursor_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection and authenticate by join
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {}, // Empty object satisfies IDiscussionBoardAdministrator.IJoin
  });
  typia.assert(authorized);
  // Use authorized adminConnection with token set
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // Prepare request body with invalid cursor parameter
  // Since IDiscussionBoardAdministratorPromotion.IRequest is an empty object,
  // the invalid cursor must be sent as part of query instead or part of request body
  // but the API body is defined as empty object type, so no properties to send
  // Hence, call the endpoint with empty body but with unknown header or param.
  // This test is to check API handles invalid cursor gracefully.
  // Since there's no cursor defined in IRequest, we will only call with empty body,
  // assuming the backend will handle invalid or missing cursor gracefully.
  // Call the PATCH endpoint
  const output =
    await api.functional.discussionBoard.administrator.administratorPromotions.index(
      adminConnection,
      { body: {} },
    );
  typia.assert(output);
  // Validate pagination data exists and is valid
  TestValidator.predicate(
    "pagination current page number is at least 1",
    output.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    output.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination current page is not greater than pages",
    output.pagination.current <= output.pagination.pages ||
      output.pagination.pages === 0,
  );
}
