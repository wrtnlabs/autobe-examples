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

export async function test_api_feed_home_controversial(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: typia.random<ICommunityMember.IJoin>(),
  });
  // 2. Fetch controversial feed
  const feedResponse = await api.functional.community.member.feed.home.index(
    memberConnection,
    {
      body: {} satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(feedResponse);
  // 3. Validate response structure
  TestValidator.predicate(
    "pagination is defined",
    feedResponse.pagination !== null,
  );
  TestValidator.predicate(
    "has at least one post",
    feedResponse.data.length > 0,
  );
  TestValidator.predicate(
    "records is non-negative",
    feedResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "limit is positive",
    feedResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "current is at least 1",
    feedResponse.pagination.current >= 1,
  );
}
