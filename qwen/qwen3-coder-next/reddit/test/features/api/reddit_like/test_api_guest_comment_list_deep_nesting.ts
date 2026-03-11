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

export async function test_api_guest_comment_list_deep_nesting(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Join as guest
  const guestConnection: api.IConnection = { host: connection.host };
  const guest = await authorize_guest_join(guestConnection, {
    body: {
      device_id: typia.random<string & tags.Format<"uuid">>(),
    } satisfies IRedditLikeGuest.IJoin,
  });
  typia.assert(guest);
  // Step 2: Use a random post ID for testing comment listing
  const postId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Test comment listing with different sorting options
  const newSort = await api.functional.redditLike.guest.posts.comments.index(
    guestConnection,
    {
      postId: postId,
      body: {
        sort: "new",
        limit: 10,
        offset: 0,
      } satisfies IRedditLikeComment.IRequest,
    },
  );
  typia.assert(newSort);
  const bestSort = await api.functional.redditLike.guest.posts.comments.index(
    guestConnection,
    {
      postId: postId,
      body: {
        sort: "best",
        limit: 10,
        offset: 0,
      } satisfies IRedditLikeComment.IRequest,
    },
  );
  typia.assert(bestSort);
  const controversialSort =
    await api.functional.redditLike.guest.posts.comments.index(
      guestConnection,
      {
        postId: postId,
        body: {
          sort: "controversial",
          limit: 10,
          offset: 0,
        } satisfies IRedditLikeComment.IRequest,
      },
    );
  typia.assert(controversialSort);
  // Step 4: Test pagination
  const paginated = await api.functional.redditLike.guest.posts.comments.index(
    guestConnection,
    {
      postId: postId,
      body: {
        sort: "new",
        limit: 5,
        offset: 0,
      } satisfies IRedditLikeComment.IRequest,
    },
  );
  typia.assert(paginated);
  // Step 5: Validate response structure
  TestValidator.equals(
    "has pagination info",
    paginated.pagination !== undefined,
    true,
  );
  TestValidator.predicate("has data array", Array.isArray(paginated.data));
  TestValidator.equals("data matches limit", paginated.data.length <= 5, true);
  TestValidator.predicate(
    "valid pagination fields",
    paginated.pagination.current >= 0 &&
      paginated.pagination.limit >= 0 &&
      paginated.pagination.records >= 0 &&
      paginated.pagination.pages >= 0,
  );
  // Step 6: Validate comment structure if data exists
  if (paginated.data.length > 0) {
    TestValidator.predicate(
      "comments have author",
      paginated.data.every((comment) => comment.author !== undefined),
    );
    TestValidator.predicate(
      "comments have content",
      paginated.data.every((comment) => typeof comment.content === "string"),
    );
    TestValidator.predicate(
      "comments have vote_score",
      paginated.data.every((comment) => typeof comment.vote_score === "number"),
    );
    TestValidator.predicate(
      "comments have timestamps",
      paginated.data.every(
        (comment) =>
          comment.created_at !== undefined &&
          comment.updated_at !== undefined &&
          comment.deleted_at !== undefined,
      ),
    );
    TestValidator.predicate(
      "hierarchy preserved with parent_comment_id",
      paginated.data.every(
        (comment) => comment.parent_comment_id !== undefined,
      ),
    );
  }
}
