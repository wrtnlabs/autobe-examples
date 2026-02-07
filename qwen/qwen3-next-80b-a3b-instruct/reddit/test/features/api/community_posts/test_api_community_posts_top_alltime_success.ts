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

export async function test_api_community_posts_top_alltime_success(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate member by joining
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {} satisfies ICommunityMember.IJoin,
  });
  // Call the top posts endpoint with allTime filter (default pagination)
  const response = await api.functional.community.member.posts.top.index(
    memberConnection,
    {
      body: {} satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(response);
  // Validate response structure
  TestValidator.equals(
    "pagination exists",
    response.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination current page is 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit is 20", response.pagination.limit, 20);
  TestValidator.predicate("posts exist", response.data.length > 0);
  TestValidator.predicate(
    "all posts have valid id",
    response.data.every((post) => (post as any).id.length > 0),
  );
  TestValidator.predicate(
    "posts sorted by vote_score descending",
    response.data.every(
      (post, idx, arr) =>
        idx === 0 || (arr[idx - 1] as any).vote_score >= (post as any).vote_score,
    ),
  );
  TestValidator.predicate(
    "all posts are approved",
    response.data.every((post) => (post as any).status === "approved"),
  );
  TestValidator.predicate(
    "no deleted posts",
    response.data.every((post) => (post as any).deleted_at === null),
  );
}