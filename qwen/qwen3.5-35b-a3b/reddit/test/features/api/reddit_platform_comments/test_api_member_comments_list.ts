import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformComment";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
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

export async function test_api_member_comments_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username:
        RandomGenerator.alphaNumeric(6) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create fresh connection with member's auth token
  const memberAuthConnection: api.IConnection = { host: connection.host };
  memberAuthConnection.headers = {
    ...memberAuthConnection.headers,
    Authorization: memberAuth.token.access,
  };
  // 3. Call comments list endpoint with default pagination
  const commentsList =
    await api.functional.redditPlatform.member.users.me.comments.index(
      memberAuthConnection,
      {
        body: {},
      },
    );
  typia.assert(commentsList);
  // 4. Validate pagination structure
  const pagination = commentsList.pagination;
  TestValidator.equals("pagination current page", pagination.current, 1);
  TestValidator.equals("pagination limit", pagination.limit, 20);
  TestValidator.equals("pagination records", pagination.records, 0);
  TestValidator.equals("pagination pages", pagination.pages, 0);
  // 5. Validate empty data array for new member
  TestValidator.equals(
    "comments data array exists",
    Array.isArray(commentsList.data),
    true,
  );
  TestValidator.equals("comments count is zero", commentsList.data.length, 0);
  // 6. Validate response structure with typia.assert
  // If there were comments, each would have:
  // - id (UUID)
  // - content (string)
  // - upvotes_count, downvotes_count, score (number)
  // - comment_count (number)
  // - author: IRedditPlatformMember.ISummary
  // - post: IRedditPlatformPost.ISummary
  // - created_at, updated_at (ISO 8601)
  // - deleted_at (null)
}
