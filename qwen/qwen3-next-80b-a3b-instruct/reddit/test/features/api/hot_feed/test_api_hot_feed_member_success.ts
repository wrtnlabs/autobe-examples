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

export async function test_api_hot_feed_member_success(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: typia.random<ICommunityMember.IJoin>(),
  });
  // Retrieve hot feed
  const hotFeed = await api.functional.community.member.posts.hot.index(
    memberConnection,
    {
      body: typia.random<ICommunityPost.IRequest>(),
    },
  );
  typia.assert(hotFeed);
  // Validate pagination
  TestValidator.equals("pagination limit is 20", hotFeed.pagination.limit, 20);
  TestValidator.predicate(
    "pagination current is at least 1",
    hotFeed.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    hotFeed.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    hotFeed.pagination.pages >= 0,
  );
  // Validate data structure
  TestValidator.predicate("data array is not empty", hotFeed.data.length > 0);
  TestValidator.equals(
    "data array length matches limit",
    hotFeed.data.length,
    hotFeed.pagination.limit,
  );
  // Validate each post summary
  for (const post of hotFeed.data) {
    // Validate post structure - schema only has empty ISummary, so we just check existence
    // No additional validation possible as ISummary is empty in provided DTO
  }
}
