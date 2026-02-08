import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";

export async function test_api_registered_user_profile_retrieval_various_cases(
  connection: api.IConnection,
): Promise<void> {
  // 1. Registered user joins (empty body due to DTO limitation)
  const userJoinConnection: api.IConnection = { host: connection.host };
  const registeredUserAuthorized = await authorize_registered_user_join(
    userJoinConnection,
    {
      body: {},
    },
  );
  typia.assert(registeredUserAuthorized);
  // 2. Registered user logs in (empty body due to DTO limitation)
  const userLoginConnection: api.IConnection = { host: connection.host };
  const registeredUserLogin = await authorize_registered_user_login(
    userLoginConnection,
    {
      body: {},
    },
  );
  typia.assert(registeredUserLogin);
  // 3. Retrieve own profile by ID - using 'at' endpoint
  const ownProfile =
    await api.functional.discussionBoard.registeredUser.registeredUsers.at(
      userLoginConnection,
      {
        id: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(ownProfile);
  // 4. Administrator joins
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(
    adminJoinConnection,
    {
      body: {},
    },
  );
  typia.assert(adminAuthorized);
  // 5. Administrator logs in
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminLogin = await authorize_administrator_login(adminLoginConnection, {
    body: {},
  });
  typia.assert(adminLogin);
  // 6. Administrator tries to get profile of registered user - generate UUID
  const otherUserId = typia.random<string & tags.Format<"uuid">>();
  const otherUserProfile =
    await api.functional.discussionBoard.registeredUser.registeredUsers.at(
      adminLoginConnection,
      {
        id: otherUserId,
      },
    );
  typia.assert(otherUserProfile);
  // 7. Try to get profile with non-existing ID - expect HttpError 404
  const nonExistingUserId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "Profile retrieval of non-existing user should fail with 404",
    404,
    async () => {
      await api.functional.discussionBoard.registeredUser.registeredUsers.at(
        userLoginConnection,
        {
          id: nonExistingUserId,
        },
      );
    },
  );
}
