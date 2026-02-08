import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorRequest";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_discussion_board_administrator_administrator_requests_create_administrator_request } from "../../../generate/generate_random_discussion_board_administrator_administrator_requests_create_administrator_request";
import { prepare_random_discussion_board_administrator_request } from "../../../prepare/prepare_random_discussion_board_administrator_request";

export async function test_api_super_administrator_administrator_requests_pending_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // This test validates the pagination feature of the pending administrator requests listing for a super administrator.
  // 1. Setup super administrator account and login
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminJoinBody =
    typia.random<IDiscussionBoardSuperAdministrator.IJoin>();
  const superAdminJoinResult = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: superAdminJoinBody,
    },
  );
  superAdminConnection.headers = {
    Authorization: superAdminJoinResult.token.access,
  };
  const superAdminLoginBody = superAdminJoinBody;
  const superAdminLoginResult = await authorize_super_administrator_login(
    superAdminConnection,
    {
      body: superAdminLoginBody,
    },
  );
  superAdminConnection.headers = {
    Authorization: superAdminLoginResult.token.access,
  };
  // 2. Create multiple administrator accounts (users) and login
  const adminConnections: api.IConnection[] = [];
  const adminJoinBodies: IDiscussionBoardAdministrator.IJoin[] = [];
  const adminCount = 10; // enough to generate multiple pages
  for (let i = 0; i < adminCount; ++i) {
    const adminConn: api.IConnection = { host: connection.host };
    const adminJoinBody = typia.random<IDiscussionBoardAdministrator.IJoin>();
    const adminJoinResult = await authorize_administrator_join(adminConn, {
      body: adminJoinBody,
    });
    adminConn.headers = {
      Authorization: adminJoinResult.token.access,
    };
    adminConnections.push(adminConn);
    adminJoinBodies.push(adminJoinBody);
  }
  // 3. Each admin user creates a pending administrator request
  for (const adminConn of adminConnections) {
    await generate_random_discussion_board_administrator_administrator_requests_create_administrator_request(
      adminConn,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  }
  // 4. Fetch the first page with default or custom limit and validate
  const page1 =
    await api.functional.discussionBoard.superAdministrator.administratorRequests.pending.index(
      superAdminConnection,
    );
  typia.assert(page1);
  TestValidator.predicate(
    "pagination current page should be >= 1",
    page1.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit should be > 0",
    page1.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records should be >= data length",
    page1.pagination.records >= page1.data.length,
  );
  TestValidator.predicate(
    "pagination pages should be >= 1",
    page1.pagination.pages >= 1,
  );
  // 5. Test the pagination with limit = 1 to have minimal page size
  // (simulate query params by customizing connection)
  let url = new URL(superAdminConnection.host);
  url.pathname =
    "/discussionBoard/superAdministrator/administratorRequests/pending";
  url.searchParams.set("limit", "1");
  let limitedConnection: api.IConnection = {
    host: url.toString(),
    headers: superAdminConnection.headers,
  };
  const limitedPage =
    await api.functional.discussionBoard.superAdministrator.administratorRequests.pending.index(
      limitedConnection,
    );
  typia.assert(limitedPage);
  TestValidator.equals(
    "pagination limit should be 1",
    limitedPage.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "pagination pages should be >= number of admin requests",
    limitedPage.pagination.pages >= adminCount,
  );
  // 6. Test requesting a page beyond total pages
  url = new URL(superAdminConnection.host);
  url.pathname =
    "/discussionBoard/superAdministrator/administratorRequests/pending";
  url.searchParams.set("limit", "1");
  url.searchParams.set("page", "99999");
  const beyondPageConnection: api.IConnection = {
    host: url.toString(),
    headers: superAdminConnection.headers,
  };
  const beyondPage =
    await api.functional.discussionBoard.superAdministrator.administratorRequests.pending.index(
      beyondPageConnection,
    );
  typia.assert(beyondPage);
  TestValidator.predicate(
    "requested page beyond total pages should return empty data",
    beyondPage.data.length === 0,
  );
  // 7. Test authorization enforcement by trying with a non-superAdmin
  const userConn: api.IConnection = { host: connection.host };
  // Prepare a normal administrator user
  const userJoinBody = typia.random<IDiscussionBoardAdministrator.IJoin>();
  const userJoinResult = await authorize_administrator_join(userConn, {
    body: userJoinBody,
  });
  userConn.headers = {
    Authorization: userJoinResult.token.access,
  };
  const userLoginBody = userJoinBody;
  const userLoginResult = await authorize_administrator_login(userConn, {
    body: userLoginBody,
  });
  userConn.headers = {
    Authorization: userLoginResult.token.access,
  };
  // Expect error when non-superAdmin tries to access
  await TestValidator.error(
    "non-superadmin access should fail",
    async () =>
      await api.functional.discussionBoard.superAdministrator.administratorRequests.pending.index(
        userConn,
      ),
  );
}
