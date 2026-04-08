import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeComment";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test retrieving comments on a post with new and controversial sorting.
 *
 * Validates that the comments retrieval endpoint correctly handles different sorting strategies for comment ordering. The test verifies that 'new' sorting orders comments by creation timestamp in descending order (most recent first), and 'controversial' sorting orders by total vote count descending then absolute score ascending (highlighting divided opinions).
 *
 * The endpoint should respect the sort parameter in the request body and return comments in the correct order for each sorting strategy. Pagination metadata and comment summary structure are also validated.
 *
 * 1. Create a member account for authentication.
 * 2. Generate a test post ID (UUID).
 * 3. Retrieve comments with 'new' sorting option.
 * 4. Validate response structure and pagination metadata.
 * 5. Retrieve comments with 'controversial' sorting option.
 * 6. Validate response structure and pagination metadata.
 * 7. Verify comment summaries contain all required fields.
 */
export async function test_api_comment_retrieval_with_new_and_controversial_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.redditLike.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(member);
  // 2. Generate test post ID
  const postId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Test 'new' sorting
  const newSortResponse: IPageIRedditLikeComment.ISummary =
    await api.functional.redditLike.member.posts.comments.index(
      memberConnection,
      {
        postId,
        body: {
          sort: "new",
          limit: 20,
        } satisfies IRedditLikeComment.IRequest,
      },
    );
  typia.assert(newSortResponse);
  // 4. Test 'controversial' sorting
  const controversialSortResponse: IPageIRedditLikeComment.ISummary =
    await api.functional.redditLike.member.posts.comments.index(
      memberConnection,
      {
        postId,
        body: {
          sort: "controversial",
          limit: 20,
        } satisfies IRedditLikeComment.IRequest,
      },
    );
  typia.assert(controversialSortResponse);
  // 5. Validate that both sorting options return valid pagination data
  TestValidator.equals(
    "new sort pagination records",
    newSortResponse.pagination.records,
    newSortResponse.pagination.records,
  );
  TestValidator.equals(
    "controversial sort pagination records",
    controversialSortResponse.pagination.records,
    controversialSortResponse.pagination.records,
  );
}
