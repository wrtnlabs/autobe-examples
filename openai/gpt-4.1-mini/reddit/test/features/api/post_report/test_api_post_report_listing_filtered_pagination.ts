import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_post_report_listing_filtered_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. User registration and authorization
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {},
  });
  userConnection.headers = {
    Authorization: `Bearer ${authorizedUser.token.access}`,
  };
  // 2. Authorized call with empty body (only valid input)
  {
    const response =
      await api.functional.communityPlatform.user.post_reports.index(
        userConnection,
        { body: {} },
      );
    typia.assert(response);
    // pagination sanity checks
    TestValidator.predicate(
      "pagination current page non-negative",
      response.pagination.current >= 0,
    );
    TestValidator.predicate(
      "pagination limit non-negative",
      response.pagination.limit >= 0,
    );
    TestValidator.predicate(
      "pagination pages non-negative",
      response.pagination.pages >= 0,
    );
    TestValidator.predicate(
      "pagination records non-negative",
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      "data length less or equal limit",
      response.data.length <= response.pagination.limit,
    );
  }
  // 3. Unauthorized access attempt
  {
    const unauthorizedConnection: api.IConnection = { host: connection.host };
    await TestValidator.httpError(
      "unauthorized access returns 401",
      401,
      async () => {
        await api.functional.communityPlatform.user.post_reports.index(
          unauthorizedConnection,
          { body: {} },
        );
      },
    );
  }
}
