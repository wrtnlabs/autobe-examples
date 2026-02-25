import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorRequest";
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
import { generate_random_discussion_board_registered_user_administrator_requests_create_administrator_request } from "../../../generate/generate_random_discussion_board_registered_user_administrator_requests_create_administrator_request";
import { prepare_random_discussion_board_administrator_request } from "../../../prepare/prepare_random_discussion_board_administrator_request";

export async function test_api_super_administrator_administrator_request_delete_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super Administrator join and login
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      },
    },
  );
  typia.assert(superAdmin);
  // 2. Registered user join
  const userConnection: api.IConnection = { host: connection.host };
  const registeredUser = await authorize_registered_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(registeredUser);
  // 3. Create administrator request by registered user
  const request =
    await generate_random_discussion_board_registered_user_administrator_requests_create_administrator_request(
      userConnection,
      {
        body: { reason: RandomGenerator.paragraph({ sentences: 1 }) },
      },
    );
  typia.assert(request);
  // 4. Delete the created administrator request as super administrator
  await api.functional.discussionBoard.superAdministrator.administrator.requests.erase(
    superAdminConnection,
    {
      requestId: request.id,
    },
  );
  // 5. Verify that the request is removed by attempting a deletion again expecting a 404 error
  await TestValidator.httpError(
    "administrator request deleted",
    404,
    async () =>
      await api.functional.discussionBoard.superAdministrator.administrator.requests.erase(
        superAdminConnection,
        {
          requestId: request.id,
        },
      ),
  );
  // 6. Verify that a registered user cannot delete an administrator request
  const otherRequest =
    await generate_random_discussion_board_registered_user_administrator_requests_create_administrator_request(
      userConnection,
      {
        body: { reason: "Another reason for admin request" },
      },
    );
  typia.assert(otherRequest);
  await TestValidator.httpError(
    "non-super administrator cannot delete",
    403,
    async () =>
      await api.functional.discussionBoard.superAdministrator.administrator.requests.erase(
        userConnection,
        {
          requestId: otherRequest.id,
        },
      ),
  );
}
