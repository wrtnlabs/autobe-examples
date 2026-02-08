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

export async function test_api_discussion_board_registered_user_tags_autocomplete_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Test scenario for verifying pagination behaviour when the tag autocomplete results span multiple pages.
  // 1. Register a user because the endpoint requires registered user actor
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_registered_user_join(userConnection, {
    body: {},
  });
  userConnection.headers = { Authorization: userAuth.token.access };
  // 2. Call the autocomplete endpoint with empty request body as IDiscussionBoardTag.IRequest has no defined properties
  const output =
    await api.functional.discussionBoard.registeredUser.tags.autocomplete.index(
      userConnection,
      {
        body: {},
      },
    );
  // Assertion of response structure
  typia.assert(output);
  // Validate pagination object
  const pagination = output.pagination;
  TestValidator.predicate(
    "pagination current page is positive integer",
    pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is positive integer",
    pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records greater or equal to data length",
    pagination.records >= output.data.length,
  );
  TestValidator.predicate(
    "pagination pages is consistent",
    pagination.pages === Math.ceil(pagination.records / pagination.limit),
  );
  // Validate data length is not greater than limit
  TestValidator.predicate(
    "data array length less than or equal to limit",
    output.data.length <= pagination.limit,
  );
  // Validate each tag summary's data
  output.data.forEach((tag) => {
    typia.assert(tag);
    // Do not check for id because it does not exist on ISummary
    TestValidator.predicate(
      "tag has valid name",
      typeof (tag as any).name === "string" && (tag as any).name.length > 0,
    );
  });
}
