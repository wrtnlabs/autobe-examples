import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_posts_sorting_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const request = {
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformPost.IRequest;
  const hot = await api.functional.communityPlatform.admin.posts.index(
    adminConnection,
    {
      body: {
        ...request,
        sort: "hot",
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(hot);
  const newest = await api.functional.communityPlatform.admin.posts.index(
    adminConnection,
    {
      body: {
        ...request,
        sort: "new",
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(newest);
  const topToday = await api.functional.communityPlatform.admin.posts.index(
    adminConnection,
    {
      body: {
        ...request,
        sort: "top",
        topWindow: "today",
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(topToday);
  const controversial =
    await api.functional.communityPlatform.admin.posts.index(adminConnection, {
      body: {
        ...request,
        sort: "controversial",
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(controversial);
  const secondPage = await api.functional.communityPlatform.admin.posts.index(
    adminConnection,
    {
      body: {
        ...request,
        page: 2,
        sort: "new",
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(secondPage);
  for (const [title, page] of [
    ["hot", hot],
    ["new", newest],
    ["top today", topToday],
    ["controversial", controversial],
    ["second page", secondPage],
  ] as const) {
    TestValidator.equals(
      `${title} pagination current`,
      page.pagination.current,
      title === "second page" ? 2 : 1,
    );
    TestValidator.equals(
      `${title} pagination limit`,
      page.pagination.limit,
      request.limit,
    );
    TestValidator.predicate(
      `${title} page size within limit`,
      page.data.length <= page.pagination.limit,
    );
  }
  if (newest.data.length >= 2) {
    TestValidator.predicate(
      "new sort orders by createdAt descending",
      newest.data.every(
        (_post, index, array) =>
          index === 0 ||
          new Date(array[index - 1].createdAt).getTime() >=
            new Date(array[index].createdAt).getTime(),
      ),
    );
  }
  if (hot.data.length >= 2) {
    TestValidator.predicate(
      "hot sort returns a stable ordered list",
      hot.data.every(
        (_post, index, array) =>
          index === 0 ||
          new Date(array[index - 1].createdAt).getTime() >=
            new Date(array[index].createdAt).getTime() ||
          array[index - 1].voteScore >= array[index].voteScore,
      ),
    );
  }
  if (topToday.data.length >= 2) {
    TestValidator.predicate(
      "top today sort returns a comparable list",
      topToday.data.every(
        (_post, index, array) =>
          index === 0 || array[index - 1].voteScore >= array[index].voteScore,
      ),
    );
  }
  if (controversial.data.length >= 2) {
    TestValidator.predicate(
      "controversial sort returns a comparable list",
      controversial.data.every(
        (_post, index, array) =>
          index === 0 ||
          Math.abs(array[index - 1].voteScore) <=
            Math.abs(array[index].voteScore) ||
          array[index - 1].commentCount >= array[index].commentCount,
      ),
    );
  }
}
