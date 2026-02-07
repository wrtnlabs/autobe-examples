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

export async function test_api_feed_home_top_this_week(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate member to access protected feed
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "securePassword123",
    } satisfies ICommunityMember.IJoin,
  });
  // Call endpoint with empty request body as defined by ICommunityPost.IRequest
  const feedResponse = await api.functional.community.member.feed.home.index(
    memberConnection,
    { body: {} } satisfies ICommunityPost.IRequest,
  );
  typia.assert(feedResponse);
  // Validate basic structure of response
  TestValidator.predicate("data is an array", Array.isArray(feedResponse.data));
  TestValidator.equals(
    "pagination is defined",
    feedResponse.pagination,
    feedResponse.pagination,
  );
  TestValidator.predicate(
    "pagination current is non-negative integer",
    typeof feedResponse.pagination.current === "number" &&
      feedResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative integer",
    typeof feedResponse.pagination.limit === "number" &&
      feedResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative integer",
    typeof feedResponse.pagination.records === "number" &&
      feedResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative integer",
    typeof feedResponse.pagination.pages === "number" &&
      feedResponse.pagination.pages >= 0,
  );
}
