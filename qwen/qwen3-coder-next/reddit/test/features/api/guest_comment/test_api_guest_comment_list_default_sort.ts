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

export async function test_api_guest_comment_list_default_sort(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest account for unauthenticated access
  const guestConnection: api.IConnection = { host: connection.host };
  const guest = await authorize_guest_join(guestConnection, {
    body: {
      device_id: typia.random<string & tags.Format<"uuid">>(),
    } satisfies IRedditLikeGuest.IJoin,
  });
  typia.assert(guest);
  // 2. Generate a random post ID for testing
  const postId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve comments with default sorting (best)
  const output = await api.functional.redditLike.guest.posts.comments.index(
    guestConnection,
    {
      postId: postId,
      body: {
        sort: "best",
      } satisfies IRedditLikeComment.IRequest,
    },
  );
  typia.assert(output);
  // 4. Validate pagination structure
  TestValidator.equals("pagination exists", output.pagination.current, 1);
  TestValidator.equals("pagination limit", output.pagination.limit, 20);
  TestValidator.predicate("has records", output.pagination.records >= 0);
  // 5. Validate comment summary structure
  if (output.data.length > 0) {
    const sample = output.data[0];
    TestValidator.equals("comment has id", typeof sample.id, "string");
    TestValidator.equals(
      "comment has content",
      typeof sample.content,
      "string",
    );
    TestValidator.equals(
      "comment has vote_score",
      typeof sample.vote_score,
      "number",
    );
    TestValidator.equals(
      "comment has created_at",
      typeof sample.created_at,
      "string",
    );
    TestValidator.equals(
      "comment has updated_at",
      typeof sample.updated_at,
      "string",
    );
    TestValidator.equals(
      "comment has deleted_at",
      sample.deleted_at === null || typeof sample.deleted_at === "string",
      true,
    );
    TestValidator.equals("comment has author", typeof sample.author, "object");
    TestValidator.equals(
      "comment has parent_comment_id",
      sample.parent_comment_id === null ||
        typeof sample.parent_comment_id === "string",
      true,
    );
    // Validate author structure
    TestValidator.equals("author has id", typeof sample.author.id, "string");
    TestValidator.equals(
      "author has username",
      typeof sample.author.username,
      "string",
    );
    TestValidator.equals(
      "author has display_name",
      typeof sample.author.display_name,
      "string",
    );
    TestValidator.equals(
      "author has karma_score",
      typeof sample.author.karma_score,
      "number",
    );
    TestValidator.equals(
      "author has created_at",
      typeof sample.author.created_at,
      "string",
    );
  }
}
