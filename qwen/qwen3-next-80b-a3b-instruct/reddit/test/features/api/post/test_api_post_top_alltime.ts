import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_post_top_alltime(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  // Request top posts with allTime filter and top sort algorithm
  const result = await api.functional.community.admin.posts.top.index(
    adminConnection,
    {
      body: {} satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(result);
  // Verify results based on what is defined in DTO
  TestValidator.equals("pagination limit", result.pagination.limit, 20);
  TestValidator.equals("result count", result.data.length, 20);
  // Verify data is an array of ICommunityPost.ISummary
  TestValidator.predicate("data is array", Array.isArray(result.data));
  TestValidator.predicate(
    "each item is ICommunityPost.ISummary",
    result.data.every((item) => {
      // We know ICommunityPost.ISummary is an empty object, so we check it's an object
      return typeof item === "object" && item !== null;
    }),
  );
}
