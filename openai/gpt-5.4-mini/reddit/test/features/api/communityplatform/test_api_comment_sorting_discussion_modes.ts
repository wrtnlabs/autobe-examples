import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_comment_sorting_discussion_modes(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const request = {
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformComment.IRequest;
  const newResult = await api.functional.communityPlatform.admin.comments.index(
    adminConnection,
    {
      body: {
        ...request,
        sort: "new",
      } satisfies ICommunityPlatformComment.IRequest,
    },
  );
  typia.assert(newResult);
  const bestResult =
    await api.functional.communityPlatform.admin.comments.index(
      adminConnection,
      {
        body: {
          ...request,
          sort: "best",
        } satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert(bestResult);
  const controversialResult =
    await api.functional.communityPlatform.admin.comments.index(
      adminConnection,
      {
        body: {
          ...request,
          sort: "controversial",
        } satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert(controversialResult);
  TestValidator.equals(
    "new sort pagination page",
    newResult.pagination.current,
    bestResult.pagination.current,
  );
  TestValidator.equals(
    "new sort pagination page",
    bestResult.pagination.current,
    controversialResult.pagination.current,
  );
  TestValidator.equals(
    "new sort pagination limit",
    newResult.pagination.limit,
    bestResult.pagination.limit,
  );
  TestValidator.equals(
    "new sort pagination limit",
    bestResult.pagination.limit,
    controversialResult.pagination.limit,
  );
  TestValidator.equals(
    "new sort total records",
    newResult.pagination.records,
    bestResult.pagination.records,
  );
  TestValidator.equals(
    "new sort total records",
    bestResult.pagination.records,
    controversialResult.pagination.records,
  );
  TestValidator.equals(
    "new sort total pages",
    newResult.pagination.pages,
    bestResult.pagination.pages,
  );
  TestValidator.equals(
    "new sort total pages",
    bestResult.pagination.pages,
    controversialResult.pagination.pages,
  );
  for (let i = 1; i < newResult.data.length; i++) {
    TestValidator.predicate(
      "new sorting should order comments by descending created_at",
      newResult.data[i - 1].created_at >= newResult.data[i].created_at,
    );
  }
  TestValidator.equals(
    "best sorting should preserve summary data count on same query scope",
    bestResult.data.length,
    newResult.data.length,
  );
  TestValidator.equals(
    "controversial sorting should preserve summary data count on same query scope",
    controversialResult.data.length,
    newResult.data.length,
  );
  if (newResult.data.length > 0) {
    TestValidator.equals(
      "comment summary shape should be stable for new sorting",
      newResult.data.map((comment) => comment.community_platform_post_id),
      bestResult.data.map((comment) => comment.community_platform_post_id),
    );
    TestValidator.equals(
      "comment summary shape should be stable for controversial sorting",
      newResult.data.map((comment) => comment.community_platform_post_id),
      controversialResult.data.map(
        (comment) => comment.community_platform_post_id,
      ),
    );
  }
}
