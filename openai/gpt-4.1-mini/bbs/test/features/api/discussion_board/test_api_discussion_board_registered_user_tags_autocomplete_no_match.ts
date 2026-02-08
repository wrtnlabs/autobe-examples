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

export async function test_api_discussion_board_registered_user_tags_autocomplete_no_match(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new user for authentication
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_registered_user_join(userConnection, { body: {} });
  // 2. Query the tags autocomplete endpoint with a search that yields no matches
  const emptySearchBody: IDiscussionBoardTag.IRequest = {};
  const result =
    await api.functional.discussionBoard.registeredUser.tags.autocomplete.index(
      userConnection,
      { body: emptySearchBody },
    );
  // Assert the response structure and data
  typia.assert(result);
  // Validate that no data is returned and pagination stats are zero
  TestValidator.equals("data length", result.data.length, 0);
  TestValidator.equals("pagination records", result.pagination.records, 0);
  TestValidator.equals("pagination pages", result.pagination.pages, 0);
  TestValidator.equals("pagination current", result.pagination.current, 1);
  TestValidator.equals("pagination limit", result.pagination.limit, 10);
}
