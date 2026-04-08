import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformComment";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import type { IRedditPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostLink";
import type { IRedditPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostText";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_posts_comments_index_filtering_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.alphaNumeric(6),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Generate test dates for filtering
  const now = new Date();
  const oneHourBefore = new Date(now.getTime() - 60 * 60 * 1000);
  const twoHoursBefore = new Date(now.getTime() - 120 * 60 * 1000);
  const oneDayBefore = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const farFutureDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  // 3. Test pagination: default values (page=1, limit=20)
  let response = await api.functional.redditPlatform.posts.comments.index(
    connection,
    {
      postId: typia.random<string & tags.Format<"uuid">>(),
      body: {} satisfies IRedditPlatformComment.IRequest,
    },
  );
  typia.assert(response);
  // Validate pagination structure
  TestValidator.equals(
    "pagination: current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination: default limit",
    response.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination: pages >= 0",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination: records >= 0",
    response.pagination.records >= 0,
  );
  // 4. Test pagination: custom page and limit
  response = await api.functional.redditPlatform.posts.comments.index(
    connection,
    {
      postId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        page: 1,
        limit: 50,
      } satisfies IRedditPlatformComment.IRequest,
    },
  );
  typia.assert(response);
  TestValidator.equals(
    "pagination: custom limit",
    response.pagination.limit,
    50,
  );
  TestValidator.equals(
    "pagination: current page",
    response.pagination.current,
    1,
  );
  // 5. Test pagination: maximum limit (100)
  response = await api.functional.redditPlatform.posts.comments.index(
    connection,
    {
      postId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        limit: 100,
      } satisfies IRedditPlatformComment.IRequest,
    },
  );
  typia.assert(response);
  TestValidator.equals("pagination: max limit", response.pagination.limit, 100);
  // 6. Test pagination: minimum limit (1)
  response = await api.functional.redditPlatform.posts.comments.index(
    connection,
    {
      postId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        limit: 1,
      } satisfies IRedditPlatformComment.IRequest,
    },
  );
  typia.assert(response);
  TestValidator.equals("pagination: min limit", response.pagination.limit, 1);
  // 7. Test created_at_start filtering (filter comments created on or after timestamp)
  response = await api.functional.redditPlatform.posts.comments.index(
    connection,
    {
      postId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        created_at_start: oneHourBefore.toISOString(),
      } satisfies IRedditPlatformComment.IRequest,
    },
  );
  typia.assert(response);
  TestValidator.predicate(
    "filtering: created_at_start accepted",
    response.pagination.records >= 0,
  );
  // 8. Test created_at_end filtering (filter comments created before timestamp)
  response = await api.functional.redditPlatform.posts.comments.index(
    connection,
    {
      postId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        created_at_end: now.toISOString(),
      } satisfies IRedditPlatformComment.IRequest,
    },
  );
  typia.assert(response);
  TestValidator.predicate(
    "filtering: created_at_end accepted",
    response.pagination.records >= 0,
  );
  // 9. Test date range filtering (created_at_start + created_at_end)
  response = await api.functional.redditPlatform.posts.comments.index(
    connection,
    {
      postId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        created_at_start: oneHourBefore.toISOString(),
        created_at_end: now.toISOString(),
      } satisfies IRedditPlatformComment.IRequest,
    },
  );
  typia.assert(response);
  TestValidator.predicate(
    "filtering: date range accepted",
    response.pagination.records >= 0,
  );
  // 10. Test author_id filtering
  response = await api.functional.redditPlatform.posts.comments.index(
    connection,
    {
      postId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        author_id: memberAuth.id,
      } satisfies IRedditPlatformComment.IRequest,
    },
  );
  typia.assert(response);
  TestValidator.predicate(
    "filtering: author_id accepted",
    response.pagination.records >= 0,
  );
  // 11. Test combined filters (pagination + date range + author)
  response = await api.functional.redditPlatform.posts.comments.index(
    connection,
    {
      postId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        page: 1,
        limit: 10,
        created_at_start: oneHourBefore.toISOString(),
        created_at_end: now.toISOString(),
        author_id: memberAuth.id,
      } satisfies IRedditPlatformComment.IRequest,
    },
  );
  typia.assert(response);
  TestValidator.equals("combined: page", response.pagination.current, 1);
  TestValidator.equals("combined: limit", response.pagination.limit, 10);
  TestValidator.predicate(
    "combined: records >= 0",
    response.pagination.records >= 0,
  );
  // 12. Test empty results with pagination structure (no comments in date range)
  response = await api.functional.redditPlatform.posts.comments.index(
    connection,
    {
      postId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        created_at_start: farFutureDate.toISOString(),
        created_at_end: farFutureDate.toISOString(),
      } satisfies IRedditPlatformComment.IRequest,
    },
  );
  typia.assert(response);
  TestValidator.equals("empty: data array", response.data.length, 0);
  TestValidator.equals("empty: records", response.pagination.records, 0);
  TestValidator.equals("empty: pages", response.pagination.pages, 0);
  TestValidator.equals("empty: current page", response.pagination.current, 1);
  TestValidator.equals("empty: limit", response.pagination.limit, 20);
  // 13. Test sorting parameters
  response = await api.functional.redditPlatform.posts.comments.index(
    connection,
    {
      postId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        sortBy: "new",
        order: "desc",
      } satisfies IRedditPlatformComment.IRequest,
    },
  );
  typia.assert(response);
  TestValidator.predicate(
    "sorting: new strategy accepted",
    response.pagination.records >= 0,
  );
  response = await api.functional.redditPlatform.posts.comments.index(
    connection,
    {
      postId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        sortBy: "top",
        order: "asc",
      } satisfies IRedditPlatformComment.IRequest,
    },
  );
  typia.assert(response);
  TestValidator.predicate(
    "sorting: top strategy accepted",
    response.pagination.records >= 0,
  );
  response = await api.functional.redditPlatform.posts.comments.index(
    connection,
    {
      postId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        sortBy: "best",
      } satisfies IRedditPlatformComment.IRequest,
    },
  );
  typia.assert(response);
  TestValidator.predicate(
    "sorting: best strategy accepted",
    response.pagination.records >= 0,
  );
  response = await api.functional.redditPlatform.posts.comments.index(
    connection,
    {
      postId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        sortBy: "controversial",
      } satisfies IRedditPlatformComment.IRequest,
    },
  );
  typia.assert(response);
  TestValidator.predicate(
    "sorting: controversial strategy accepted",
    response.pagination.records >= 0,
  );
}
