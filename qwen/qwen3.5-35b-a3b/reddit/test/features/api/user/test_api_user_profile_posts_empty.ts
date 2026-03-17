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

export async function test_api_user_profile_posts_empty(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member user to authenticate as (will make API calls)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create another member user who will have no posts
  const noPostsMemberConnection: api.IConnection = { host: connection.host };
  const noPostsMemberAuth = await authorize_member_join(
    noPostsMemberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityMember.IJoin,
    },
  );
  typia.assert(noPostsMemberAuth);
  // 3. Generate a valid UUID for a user with no posts (since we can't retrieve user ID from join)
  const noPostsUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Call the user posts endpoint with member authentication
  const postsResponse =
    await api.functional.redditCommunity.member.users.posts.index(
      memberConnection,
      {
        userId: noPostsUserId,
        body: {
          page: 1,
          limit: 20,
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(postsResponse);
  // 5. Validate empty data array
  TestValidator.equals("empty posts list", postsResponse.data.length, 0);
  // 6. Validate pagination metadata
  TestValidator.equals("current page", postsResponse.pagination.current, 1);
  TestValidator.equals("limit", postsResponse.pagination.limit, 20);
  TestValidator.equals("records", postsResponse.pagination.records, 0);
  TestValidator.equals("pages", postsResponse.pagination.pages, 0);
}