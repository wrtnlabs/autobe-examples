import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionApproval";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionApproval";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_promotion_requests_create } from "../../../generate/generate_random_discussion_board_user_promotion_requests_create";
import { prepare_random_discussion_board_administrator_promotion_approval } from "../../../prepare/prepare_random_discussion_board_administrator_promotion_approval";

export async function test_api_superadmin_promotion_requests_pagination_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "superadmin123",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.ILogin,
  });
  // Create multiple users and promotion requests
  const totalRequests = 15;
  const requests: IDiscussionBoardAdministratorPromotionApproval[] = [];
  for (let i = 0; i < totalRequests; i++) {
    const userConnection: api.IConnection = { host: connection.host };
    const user = await authorize_user_join(userConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        display_name: RandomGenerator.name(),
      },
    });
    typia.assert(user);
    // Login as the new user to create promotion request
    const loggedInUserConnection: api.IConnection = { host: connection.host };
    await authorize_user_login(loggedInUserConnection, {
      body: {
        email: user.email,
        password: "password123",
      } satisfies IDiscussionBoardUser.ILogin,
    });
    const request =
      await generate_random_discussion_board_user_promotion_requests_create(
        loggedInUserConnection,
        {
          body: {
            reason: RandomGenerator.paragraph({ sentences: 3 }),
          },
        },
      );
    typia.assert(request);
    requests.push(request);
  }
  // Test pagination with different page sizes
  const testCases = [
    { page: 1, limit: 5 },
    { page: 2, limit: 5 },
    { page: 3, limit: 5 },
    { page: 1, limit: 10 },
    { page: 2, limit: 10 },
  ];
  for (const testCase of testCases) {
    const response =
      await api.functional.discussionBoard.superAdmin.promotion_requests.index(
        superAdminConnection,
        {
          body: {
            page: testCase.page,
            limit: testCase.limit,
          } satisfies IDiscussionBoardAdministratorPromotionApproval.IRequest,
        },
      );
    typia.assert(response);
    // Validate pagination metadata - correct property access path
    TestValidator.equals(
      "current page matches",
      response.pagination.pagination.pagination.pagination.current,
      testCase.page,
    );
    TestValidator.equals(
      "limit matches",
      response.pagination.pagination.pagination.pagination.limit,
      testCase.limit,
    );
    TestValidator.predicate(
      "total records is correct",
      response.pagination.pagination.pagination.pagination.records >=
        totalRequests,
    );
    TestValidator.predicate(
      "total pages is correct",
      response.pagination.pagination.pagination.pagination.pages >=
        Math.ceil(totalRequests / testCase.limit),
    );
    TestValidator.predicate(
      "data length is correct",
      response.data.length <= testCase.limit,
    );
  }
  // Test edge cases
  // Test page beyond available pages
  const beyondPageResponse =
    await api.functional.discussionBoard.superAdmin.promotion_requests.index(
      superAdminConnection,
      {
        body: {
          page: 100,
          limit: 5,
        } satisfies IDiscussionBoardAdministratorPromotionApproval.IRequest,
      },
    );
  typia.assert(beyondPageResponse);
  TestValidator.equals(
    "beyond page returns empty data",
    beyondPageResponse.data.length,
    0,
  );
  // Test status filter with pagination
  const pendingResponse =
    await api.functional.discussionBoard.superAdmin.promotion_requests.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardAdministratorPromotionApproval.IRequest,
      },
    );
  typia.assert(pendingResponse);
  // Validate that filtered response contains data
  TestValidator.predicate(
    "pending filter returns requests",
    pendingResponse.data.length > 0,
  );
}
