import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import type { IEconomicPoliticalBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRequest";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicPoliticalBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalBoardAdministratorRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_administrator_requests_review_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create super admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<
        string & tags.Format<"email">
      >() satisfies string as string &
        tags.MinLength<1> &
        tags.MaxLength<255> &
        tags.Format<"email">
      ,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Create new connection with admin token
  const adminAuthConnection: api.IConnection = { host: connection.host };
  adminAuthConnection.headers = { Authorization: adminAuth.token.access };
  // 2. Test: Get pending administrator requests
  const result =
    await api.functional.economicPoliticalBoard.admin.administrator_requests.index(
      adminAuthConnection,
      {
        body: {
          status: "pending",
          page: 1,
          pageSize: 20,
        } satisfies IEconomicPoliticalBoardAdministratorRequest.IRequest,
      },
    );
  typia.assert(result);
  // 3. Validate response structure
  TestValidator.equals("has pagination", result.pagination !== undefined, true);
  TestValidator.predicate(
    "pagination has current page",
    result.pagination.current >= 1,
  );
  TestValidator.predicate("pagination has limit", result.pagination.limit >= 1);
  TestValidator.predicate(
    "pagination has records",
    result.pagination.records >= 0,
  );
  TestValidator.predicate("pagination has pages", result.pagination.pages >= 0);
  // 4. Validate pagination metadata consistency
  TestValidator.equals(
    "pagination records match total",
    result.pagination.records,
    result.data.length,
  );
  const expectedPages = Math.ceil(
    result.pagination.records / result.pagination.limit,
  );
  TestValidator.equals(
    "pagination pages calculated correctly",
    result.pagination.pages,
    expectedPages,
  );
  // 5. Validate all returned requests have status 'pending'
  for (const request of result.data) {
    TestValidator.equals(
      `request ${request.id} status`,
      request.status,
      "pending",
    );
    TestValidator.equals(
      `request ${request.id} has id`,
      request.id !== undefined,
      true,
    );
    TestValidator.equals(
      `request ${request.id} has reason`,
      request.reason !== undefined && request.reason.length > 0,
      true,
    );
    TestValidator.equals(
      `request ${request.id} has createdAt`,
      request.createdAt !== undefined,
      true,
    );
    TestValidator.equals(
      `request ${request.id} has author`,
      request.author !== undefined,
      true,
    );
    TestValidator.equals(
      `request ${request.id} author has id`,
      request.author.id !== undefined,
      true,
    );
    TestValidator.equals(
      `request ${request.id} author has userId`,
      request.author.userId !== undefined,
      true,
    );
    TestValidator.equals(
      `request ${request.id} author has grade`,
      request.author.grade !== undefined,
      true,
    );
    TestValidator.equals(
      `request ${request.id} author has user`,
      request.author.user !== undefined,
      true,
    );
    TestValidator.equals(
      `request ${request.id} author user has displayName`,
      request.author.user.displayName !== undefined,
      true,
    );
    TestValidator.equals(
      `request ${request.id} author user has email`,
      request.author.user.email !== undefined,
      true,
    );
  }
  // 6. Validate sorting (newest first) by checking createdAt order
  if (result.data.length > 1) {
    for (let i = 1; i < result.data.length; i++) {
      const prevCreatedAt = new Date(result.data[i - 1].createdAt).getTime();
      const currCreatedAt = new Date(result.data[i].createdAt).getTime();
      TestValidator.predicate(
        `request ${i} sorted correctly in descending order`,
        prevCreatedAt >= currCreatedAt,
      );
    }
  }
}