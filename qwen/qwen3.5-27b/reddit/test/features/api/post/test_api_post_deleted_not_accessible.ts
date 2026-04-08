import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test retrieval of a deleted or non-existent post returns 404 Not Found.
 *
 * Validates that posts which have been soft-deleted or do not exist are not accessible via the public API. The system should return a 404 Not Found error when attempting to retrieve a post that has been deleted (deleted_at is not null) or never existed.
 *
 * This test simulates the deleted post scenario by attempting to access a post with a non-existent UUID, as the actual post creation and deletion APIs are not available in the current SDK. The expected behavior is that the API returns a 404 HTTP error, ensuring that deleted content is properly hidden from public access.
 *
 * 1. Authenticate as a member using the join utility function.
 * 2. Generate a random UUID representing a deleted or non-existent post.
 * 3. Attempt to retrieve the post using the posts.at API.
 * 4. Validate that the API returns a 404 Not Found error.
 */
export async function test_api_post_deleted_not_accessible(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  // 2. Generate a random UUID representing a deleted/non-existent post
  const deletedPostId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve the deleted post and validate 404 error
  await TestValidator.httpError(
    "deleted post returns 404 Not Found",
    404,
    async () =>
      await api.functional.redditClone.posts.at(memberConnection, {
        postId: deletedPostId,
      }),
  );
}
