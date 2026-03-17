import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeComment";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_comment_sort_by_new_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest connection and authenticate
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      deviceFingerprint: typia.random<string & tags.Format<"uuid">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies IRedditLikeGuest.IJoin,
  });
  // 2. Generate a random post ID
  const postId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call endpoint with sort NEW, page 1, limit 2
  const page1 =
    await api.functional.redditLike.guest.posts.comments.sorted.index(
      guestConnection,
      {
        postId,
        body: {
          sort: "NEW",
          page: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 2 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100> as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          search: null,
          authorId: null,
          parentId: null,
          includeDeleted: false,
        } satisfies IRedditLikeComment.IRequest,
      },
    );
  typia.assert(page1);
  // 4. Validate pagination metadata for page 1
  TestValidator.equals(
    "page 1 current is 1",
    page1.pagination.current,
    1 satisfies number & tags.Type<"int32"> & tags.Minimum<0> as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
  );
  TestValidator.equals(
    "page 1 limit is 2",
    page1.pagination.limit,
    2 satisfies number & tags.Type<"int32"> & tags.Minimum<0> as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
  );
  TestValidator.predicate("page 1 records >= 0", page1.pagination.records >= 0);
  TestValidator.predicate("page 1 pages >= 0", page1.pagination.pages >= 0);
  // 5. If there are multiple pages, test page 2
  if (page1.pagination.pages > 1) {
    const page2 =
      await api.functional.redditLike.guest.posts.comments.sorted.index(
        guestConnection,
        {
          postId,
          body: {
            sort: "NEW",
            page: 2 satisfies number &
              tags.Type<"int32"> &
              tags.Minimum<1> as number & tags.Type<"int32"> & tags.Minimum<1>,
            limit: 2 satisfies number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<100> as number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<100>,
            search: null,
            authorId: null,
            parentId: null,
            includeDeleted: false,
          } satisfies IRedditLikeComment.IRequest,
        },
      );
    typia.assert(page2);
    // 6. Validate pagination metadata for page 2
    TestValidator.equals(
      "page 2 current is 2",
      page2.pagination.current,
      2 satisfies number & tags.Type<"int32"> & tags.Minimum<0> as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    );
    TestValidator.equals(
      "page 2 limit is 2",
      page2.pagination.limit,
      2 satisfies number & tags.Type<"int32"> & tags.Minimum<0> as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    );
    // 7. If both pages have data, verify page 1 has newer comments than page 2
    if (page1.data.length > 0 && page2.data.length > 0) {
      const newestPage1 = new Date(page1.data[0].created_at);
      const oldestPage2 = new Date(
        page2.data[page2.data.length - 1].created_at,
      );
      TestValidator.predicate(
        "page 1 comments are newer than page 2 comments",
        newestPage1 >= oldestPage2,
      );
    }
  }
  // 8. Validate that created_at timestamps are in descending order (NEW sort)
  for (let i = 1; i < page1.data.length; i++) {
    const prev = new Date(page1.data[i - 1].created_at);
    const curr = new Date(page1.data[i].created_at);
    TestValidator.predicate(
      `comment ${i - 1} created_at >= comment ${i} created_at (descending order)`,
      prev >= curr,
    );
  }
}
