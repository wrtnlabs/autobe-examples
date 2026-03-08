import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_feed_home_empty_subscriptions(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new member account (no subscriptions yet)
  const member: IRedditPlatformMember.IAuthorized = await authorize_member_join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<20> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditPlatformMember.IJoin,
    },
  );
  typia.assert(member);
  // Step 2: Request home feed with authenticated member connection
  const feedResponse: IPageIRedditPlatformPost.ISummary =
    await api.functional.redditPlatform.member.feeds.home.index(connection, {
      body: {
        page: 1,
        limit: 20,
      } satisfies IRedditPlatformPost.IRequest,
    });
  typia.assert(feedResponse);
  // Step 3: Validate empty feed structure
  TestValidator.equals("data array is empty", feedResponse.data.length, 0);
  TestValidator.equals(
    "pagination records is 0",
    feedResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages is 0",
    feedResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination current is 1",
    feedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 20",
    feedResponse.pagination.limit,
    20,
  );
  // Step 4: Verify response is valid (no errors)
  TestValidator.predicate(
    "feed endpoint returned success",
    feedResponse !== undefined,
  );
}
