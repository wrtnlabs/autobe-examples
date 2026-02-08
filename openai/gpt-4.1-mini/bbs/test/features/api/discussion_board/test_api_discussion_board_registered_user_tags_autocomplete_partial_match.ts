import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardTag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";

/**
 * Test scenario for successfully retrieving tag autocomplete suggestions with a partial tag name match.
 * This test validates that the response contains valid pagination info and valid tag summaries.
 * Note: Partial match testing is not feasible due to empty IRequest DTO (no filtering properties).
 */
export async function test_api_discussion_board_registered_user_tags_autocomplete_partial_match(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new user and authorize
  const userConnection: api.IConnection = { host: connection.host };
  // The IJoin type has no required properties, so empty object is valid
  const authorized = await authorize_registered_user_join(userConnection, {
    body: {},
  });
  typia.assert(authorized);
  userConnection.headers = { Authorization: authorized.token.access };
  // 2. Call the autocomplete endpoint with empty request body (no filter props exist)
  const response: IPageIDiscussionBoardTag.ISummary =
    await api.functional.discussionBoard.registeredUser.tags.autocomplete.index(
      userConnection,
      {
        body: {} satisfies IDiscussionBoardTag.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate pagination info
  const { pagination, data } = response;
  TestValidator.predicate(
    "pagination current page >= 1",
    pagination.current >= 1,
  );
  TestValidator.predicate("pagination limit > 0", pagination.limit > 0);
  TestValidator.predicate("pagination records >= 0", pagination.records >= 0);
  TestValidator.predicate("pagination pages >= 0", pagination.pages >= 0);
  TestValidator.predicate(
    "pages equals ceil(records/limit)",
    Math.ceil(pagination.records / pagination.limit) === pagination.pages ||
      (pagination.records === 0 && pagination.pages === 0),
  );
  TestValidator.equals(
    "data length check",
    data.length <= pagination.limit,
    true,
  );
  // 4. Validate all returned tags
  for (const tag of data) {
    typia.assert(tag);
  }
}
