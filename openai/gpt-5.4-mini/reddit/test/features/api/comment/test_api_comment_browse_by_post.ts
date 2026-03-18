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

export async function test_api_comment_browse_by_post(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const firstPage = await api.functional.communityPlatform.admin.comments.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
        sort: "new",
      } satisfies ICommunityPlatformComment.IRequest,
    },
  );
  typia.assert(firstPage);
  TestValidator.predicate(
    "pagination current is valid",
    firstPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    firstPage.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is valid",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is valid",
    firstPage.pagination.pages >= 0,
  );
  for (const comment of firstPage.data) {
    typia.assert(comment);
  }
  const outOfRangePage =
    await api.functional.communityPlatform.admin.comments.index(
      adminConnection,
      {
        body: {
          page: 999,
          limit: 10,
          sort: "new",
        } satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert(outOfRangePage);
  TestValidator.predicate(
    "out-of-range pagination current is valid",
    outOfRangePage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "out-of-range pagination limit is valid",
    outOfRangePage.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "out-of-range pagination records is valid",
    outOfRangePage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "out-of-range pagination pages is valid",
    outOfRangePage.pagination.pages >= 0,
  );
  TestValidator.equals(
    "out-of-range page should be empty",
    outOfRangePage.data.length,
    0,
  );
}
