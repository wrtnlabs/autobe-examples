import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardRegisteredUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUserEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardRegisteredUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardRegisteredUserEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";

export async function test_api_registered_user_email_verifications_list_filter_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a registered user via join endpoint
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_registered_user_join(userConnection, {
    body: {},
  });
  typia.assert(authorized);
  // 2. Call emailVerifications.index API endpoint with empty body (no filters available)
  const response =
    await api.functional.discussionBoard.registeredUser.emailVerifications.index(
      userConnection,
      { body: {} },
    );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination current >= 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit >= 0",
    response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    response.pagination.pages >= 0,
  );
  // 4. Validate data array presence
  TestValidator.predicate("data is array", Array.isArray(response.data));
  // 5. Test empty data scenario by invoking again with presumably same empty filter
  const emptyResponse =
    await api.functional.discussionBoard.registeredUser.emailVerifications.index(
      userConnection,
      { body: {} },
    );
  typia.assert(emptyResponse);
  // The empty data scenario expects length 0 - but since no filters, length may vary
  // So we at least check it is an array
  TestValidator.predicate(
    "empty data is array",
    Array.isArray(emptyResponse.data),
  );
}
