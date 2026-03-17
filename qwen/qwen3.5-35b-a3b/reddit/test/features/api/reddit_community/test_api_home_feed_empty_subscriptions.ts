import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_home_feed_empty_subscriptions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(joinResult);
  // 2. Create member connection with JWT token
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    Authorization: `Bearer ${joinResult.token.access}`,
  };
  // 3. Access home feed without any subscriptions
  const feedResponse =
    await api.functional.redditCommunity.member.home_feed.index(
      memberConnection,
      {
        body: {}, // Empty body uses defaults
      },
    );
  typia.assert(feedResponse);
  // 4. Validate response structure
  // Verify pagination metadata
  TestValidator.equals(
    "pagination current page",
    feedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit default",
    feedResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination records zero",
    feedResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages zero",
    feedResponse.pagination.pages,
    0,
  );
  // Verify empty posts array
  TestValidator.equals("posts array empty", feedResponse.data.length, 0);
  TestValidator.predicate("posts is array", Array.isArray(feedResponse.data));
}
