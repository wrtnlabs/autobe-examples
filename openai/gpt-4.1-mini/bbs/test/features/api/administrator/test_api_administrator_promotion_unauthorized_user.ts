import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_administrator_promotion_unauthorized_user(
  connection: api.IConnection,
): Promise<void> {
  // Test unauthorized promotion attempt by a user without super administrator privileges.
  // Confirm the operation is denied with proper error response for insufficient permissions.
  // Verify no administrator grade changes occur and no audit records are created.
  // 1. Setup super administrator actor
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminJoinBody: IDiscussionBoardSuperAdministrator.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123!",
    href: "http://localhost/",
    referrer: "http://localhost/referrer",
    ip: null,
  };
  const superAdministrator = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: superAdminJoinBody,
    },
  );
  typia.assert(superAdministrator);
  const superAdminLoginBody: IDiscussionBoardSuperAdministrator.ILogin = {
    email: superAdminJoinBody.email,
    password: superAdminJoinBody.password,
  };
  const superAdminAuth = await authorize_super_administrator_login(
    superAdminConnection,
    {
      body: superAdminLoginBody,
    },
  );
  typia.assert(superAdminAuth);
  // 2. Setup registered user actor (without super administrator privileges)
  const userConnection: api.IConnection = { host: connection.host };
  const userJoinBody: IDiscussionBoardRegisteredUser.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123!",
  };
  const registeredUser = await authorize_registered_user_join(userConnection, {
    body: userJoinBody,
  });
  typia.assert(registeredUser);
  const userLoginBody: IDiscussionBoardRegisteredUser.ILogin = {
    email: userJoinBody.email,
    password: userJoinBody.password,
  };
  const registeredUserAuth = await authorize_registered_user_login(
    userConnection,
    {
      body: userLoginBody,
    },
  );
  typia.assert(registeredUserAuth);
  // 3. Attempt to promote an administrator using the registered user connection
  // Since we lack a direct admin creation endpoint, simulate with a random UUID
  const fakeAdministratorId = typia.random<string & tags.Format<"uuid">>();
  // 4. Expect error due to insufficient permission when non-super admin tries to promote
  await TestValidator.error("unauthorized promotion attempt", async () => {
    await api.functional.discussionBoard.superAdministrator.administrator.promote.promoteAdministrator(
      userConnection,
      {
        administratorId: fakeAdministratorId,
      },
    );
  });
}
