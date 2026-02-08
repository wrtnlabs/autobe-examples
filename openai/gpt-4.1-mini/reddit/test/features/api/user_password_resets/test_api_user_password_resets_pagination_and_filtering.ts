import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_password_resets_pagination_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Testing PATCH /communityPlatform/user/password-resets endpoint for pagination and filtering
  // Authenticate user by join and create actor-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, { body: {} });
  userConnection.headers = {
    ...userConnection.headers,
    Authorization: authorized.token.access,
  };
  // Scenario 1: Retrieve password reset tokens list with no filters
  const responseDefault =
    await api.functional.communityPlatform.user.password_resets.index(
      userConnection,
      {
        body: {},
      },
    );
  typia.assert(responseDefault);
  const { pagination, data } = responseDefault;
  TestValidator.predicate(
    "pagination current is >= 1",
    pagination.current >= 1,
  );
  TestValidator.predicate("pagination limit is > 0", pagination.limit > 0);
  TestValidator.predicate(
    "pagination records is >= 0",
    pagination.records >= 0,
  );
  TestValidator.predicate("pagination pages is >= 0", pagination.pages >= 0);
  TestValidator.predicate(
    "data length matches pagination limit or less",
    data.length <= pagination.limit,
  );
  // Scenario 2: Filter tokens by used status true - Can't validate 'used', only verify response retrieval
  await api.functional.communityPlatform.user.password_resets.index(
    userConnection,
    {
      body: {
        used: true,
      } satisfies ICommunityPlatformUserPasswordReset.IRequest,
    },
  );
  // Scenario 2: Filter tokens by used status false
  await api.functional.communityPlatform.user.password_resets.index(
    userConnection,
    {
      body: {
        used: false,
      } satisfies ICommunityPlatformUserPasswordReset.IRequest,
    },
  );
  // Scenario 3: Filter tokens by expired status true
  await api.functional.communityPlatform.user.password_resets.index(
    userConnection,
    {
      body: {
        expired: true,
      } satisfies ICommunityPlatformUserPasswordReset.IRequest,
    },
  );
  // Scenario 3: Filter tokens by expired status false
  await api.functional.communityPlatform.user.password_resets.index(
    userConnection,
    {
      body: {
        expired: false,
      } satisfies ICommunityPlatformUserPasswordReset.IRequest,
    },
  );
}
