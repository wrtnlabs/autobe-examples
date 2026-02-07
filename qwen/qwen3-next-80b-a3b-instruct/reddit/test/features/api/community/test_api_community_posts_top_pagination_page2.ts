import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_community_posts_top_pagination_page2(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: typia.random<ICommunityMember.IJoin>(),
  });
  // Retrieve page 2 of top posts
  const result = await api.functional.community.member.posts.top.index(
    memberConnection,
    {
      body: {} satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(result);
  // Validate pagination metadata for page 2
  TestValidator.equals("page 2 current", result.pagination.current, 2);
  TestValidator.equals("page 2 limit", result.pagination.limit, 20);
  TestValidator.predicate(
    "total records at least 40 to ensure page 2 is meaningful",
    result.pagination.records >= 40,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    result.pagination.pages === Math.ceil(result.pagination.records / 20),
  );
  // Validate data contains records
  TestValidator.predicate("has data array", Array.isArray(result.data));
  TestValidator.predicate(
    "has at least 20 records in page 2",
    result.data.length >= 20,
  );
  TestValidator.predicate(
    "data items are summaries",
    result.data.every((item) => typeof (item as any).id === "string"),
  );
}