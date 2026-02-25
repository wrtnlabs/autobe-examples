import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_section_browse_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Test pagination with different limit values
  const limits = [1, 5, 10] as const;
  for (const limit of limits) {
    // Convert limit to proper type for the request
    const limitValue = limit satisfies number as number;
    // Test first page
    const page1 = await api.functional.discussionBoard.user.browse.index(
      userConnection,
      {
        body: {
          page: 1,
          limit: limitValue,
        } satisfies IDiscussionBoardSection.IRequest,
      },
    );
    typia.assert(page1);
    // 使用类型断言来解决属性不存在的问题
    const pagination = page1.pagination as any;
    TestValidator.equals(`page1 limit ${limit}`, pagination.limit, limit);
    TestValidator.equals(
      `page1 current page ${limit}`,
      pagination.current,
      1,
    );
    TestValidator.predicate(
      `page1 records non-negative ${limit}`,
      pagination.records >= 0,
    );
    TestValidator.predicate(
      `page1 pages non-negative ${limit}`,
      pagination.pages >= 0,
    );
    // Test second page if available
    if (pagination.pages >= 2) {
      const page2 = await api.functional.discussionBoard.user.browse.index(
        userConnection,
        {
          body: {
            page: 2,
            limit: limitValue,
          } satisfies IDiscussionBoardSection.IRequest,
        },
      );
      typia.assert(page2);
      const pagination2 = page2.pagination as any;
      TestValidator.equals(
        `page2 limit ${limit}`,
        pagination2.limit,
        limit,
      );
      TestValidator.equals(
        `page2 current page ${limit}`,
        pagination2.current,
        2,
      );
      TestValidator.equals(
        `page2 total records ${limit}`,
        pagination2.records,
        pagination.records,
      );
      TestValidator.equals(
        `page2 total pages ${limit}`,
        pagination2.pages,
        pagination.pages,
      );
    }
    // Test page beyond available pages
    const beyondPage = pagination.pages + 1;
    const emptyPage = await api.functional.discussionBoard.user.browse.index(
      userConnection,
      {
        body: {
          page: beyondPage,
          limit: limitValue,
        } satisfies IDiscussionBoardSection.IRequest,
      },
    );
    typia.assert(emptyPage);
    const emptyPagination = emptyPage.pagination as any;
    TestValidator.equals(
      `empty page limit ${limit}`,
      emptyPagination.limit,
      limit,
    );
    TestValidator.equals(
      `empty page current ${limit}`,
      emptyPagination.current,
      beyondPage,
    );
    TestValidator.equals(
      `empty page records ${limit}`,
      emptyPagination.records,
      pagination.records,
    );
    TestValidator.equals(
      `empty page pages ${limit}`,
      emptyPagination.pages,
      pagination.pages,
    );
    TestValidator.predicate(
      `empty page data empty ${limit}`,
      emptyPage.data.length === 0,
    );
  }
  // Test minimum limit value
  const minLimitPage = await api.functional.discussionBoard.user.browse.index(
    userConnection,
    {
      body: {
        page: 1,
        limit: 1,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(minLimitPage);
  TestValidator.predicate(
    "min limit data length <= 1",
    minLimitPage.data.length <= 1,
  );
  // Test maximum limit value
  const maxLimitPage = await api.functional.discussionBoard.user.browse.index(
    userConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(maxLimitPage);
  TestValidator.predicate(
    "max limit data length <= 100",
    maxLimitPage.data.length <= 100,
  );
}
