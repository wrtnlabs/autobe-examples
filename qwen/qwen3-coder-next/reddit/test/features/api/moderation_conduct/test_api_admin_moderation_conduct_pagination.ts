import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeModeratorRole";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModeratorRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_moderation_conduct_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    } satisfies IRedditLikeAdmin.IJoin,
  });
  // Retrieve paginated moderator conduct results
  // Test pagination with page=1, limit=10
  const page1 = await api.functional.redditLike.admin.moderation.conduct.index(
    adminConnection,
    {
      body: {
        ...typia.random<IRedditLikeModeratorRole.IRequest>(),
        page: 1,
        limit: 10,
      } satisfies IRedditLikeModeratorRole.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals("page 1 has records", page1.data.length > 0, true);
  TestValidator.equals(
    "page 1 pagination current",
    page1.pagination.current,
    1,
  );
  TestValidator.equals("page 1 pagination limit", page1.pagination.limit, 10);
  TestValidator.predicate(
    "page 1 pagination records >= 0",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 pagination pages >= 0",
    page1.pagination.pages >= 0,
  );
  // Test pagination with page=2, limit=10
  const page2 = await api.functional.redditLike.admin.moderation.conduct.index(
    adminConnection,
    {
      body: {
        ...typia.random<IRedditLikeModeratorRole.IRequest>(),
        page: 2,
        limit: 10,
      } satisfies IRedditLikeModeratorRole.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals(
    "page 2 pagination current",
    page2.pagination.current,
    2,
  );
  TestValidator.equals("page 2 pagination limit", page2.pagination.limit, 10);
  // Test pagination with limit=50
  const largePage =
    await api.functional.redditLike.admin.moderation.conduct.index(
      adminConnection,
      {
        body: {
          ...typia.random<IRedditLikeModeratorRole.IRequest>(),
          page: 1,
          limit: 50,
        } satisfies IRedditLikeModeratorRole.IRequest,
      },
    );
  typia.assert(largePage);
  TestValidator.equals(
    "large page pagination limit",
    largePage.pagination.limit,
    50,
  );
  // Test pagination with page=1, limit=1 (minimum pagination)
  const limit1Page =
    await api.functional.redditLike.admin.moderation.conduct.index(
      adminConnection,
      {
        body: {
          ...typia.random<IRedditLikeModeratorRole.IRequest>(),
          page: 1,
          limit: 1,
        } satisfies IRedditLikeModeratorRole.IRequest,
      },
    );
  typia.assert(limit1Page);
  TestValidator.equals(
    "limit 1 page has at most 1 record",
    limit1Page.data.length <= 1,
    true,
  );
  TestValidator.equals(
    "limit 1 page pagination limit",
    limit1Page.pagination.limit,
    1,
  );
}
