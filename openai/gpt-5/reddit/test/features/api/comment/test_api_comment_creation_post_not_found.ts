import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUser";

export async function test_api_comment_creation_post_not_found(
  connection: api.IConnection,
) {
  /**
   * Validate not-found error when creating a comment for a non-existent post.
   *
   * Steps
   *
   * 1. Join as a member user to obtain authenticated context.
   * 2. Generate a bogus postId (valid UUID format) that is not present.
   * 3. Attempt to create a comment with a valid body under the bogus postId.
   * 4. Expect the operation to fail with an error (no status code assertion).
   */

  // 1) Member join → obtain authenticated context
  const password: string = `${RandomGenerator.alphabets(5)}A1!${RandomGenerator.alphaNumeric(6)}`; // ensures letter+digit and length
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(12), // 3–20 chars, [A-Za-z0-9_]
    password,
    terms_accepted_at: new Date().toISOString(),
    privacy_accepted_at: new Date().toISOString(),
    marketing_opt_in: false,
  } satisfies ICommunityPlatformMemberUser.ICreate;
  const authorized = await api.functional.auth.memberUser.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);

  // 2) Use a random UUID that does not correspond to any post in this clean test context
  const missingPostId = typia.random<string & tags.Format<"uuid">>();

  // 3) Prepare a valid comment creation payload (no parent_id)
  const createCommentBody = {
    body: RandomGenerator.paragraph({ sentences: 12 }),
  } satisfies ICommunityPlatformComment.ICreate;

  // 4) Expect error when trying to comment on a non-existent post
  await TestValidator.error(
    "creating a comment for a non-existent post must fail",
    async () => {
      await api.functional.communityPlatform.memberUser.posts.comments.create(
        connection,
        {
          postId: missingPostId,
          body: createCommentBody,
        },
      );
    },
  );
}
