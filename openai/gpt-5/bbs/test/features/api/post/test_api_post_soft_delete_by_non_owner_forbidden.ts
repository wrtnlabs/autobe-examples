import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICivicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICivicBoardPost";
import type { ICivicBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICivicBoardUser";
import type { ICivicBoardUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICivicBoardUserSession";
import type { IECivicBoardContentStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IECivicBoardContentStatus";
import type { IECivicBoardPostStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IECivicBoardPostStatus";

/**
 * Verify that a non-owner cannot soft-delete another user's civic board post.
 *
 * Business goal: Ownership enforcement on the user-scoped delete endpoint.
 *
 * Steps:
 *
 * 1. Join as User A and obtain authorization
 * 2. Create a post as User A and validate author matches User A
 * 3. Join as User B (different account) to switch authentication context
 * 4. Attempt to delete User A's post as User B and expect an error
 *
 * Notes:
 *
 * - SDK handles Authorization header updates on join(); do not touch headers.
 * - No specific HTTP status code validation (only error existence).
 * - No read-back endpoint provided; state verification is limited to the negative
 *   authorization attempt.
 */
export async function test_api_post_soft_delete_by_non_owner_forbidden(
  connection: api.IConnection,
) {
  // 1) Join as User A (author)
  const userAEmail = typia.random<string & tags.Format<"email">>();
  const userAHrefRaw = typia.random<string & tags.Format<"uri">>();
  const userAHref = typia.assert<
    string & tags.Format<"uri"> & tags.MinLength<1>
  >(userAHrefRaw);
  const userADisplayRaw = RandomGenerator.name(1);
  const userADisplay = typia.assert<
    string & tags.MinLength<1> & tags.MaxLength<120>
  >(userADisplayRaw);

  const userA = await api.functional.auth.user.join(connection, {
    body: {
      email: userAEmail,
      password: "P@ssw0rd!",
      display_name: userADisplay,
      href: userAHref,
      referrer: "",
    } satisfies ICivicBoardUser.ICreate,
  });
  typia.assert(userA);

  // 2) Create a post as User A
  const titleSource = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 10,
  });
  // Ensure length <= 120 while preserving non-whitespace content
  const titleTrimmed = titleSource.substring(0, 120).trim() || "Title";
  const title = typia.assert<
    string &
      tags.MinLength<1> &
      tags.MaxLength<120> &
      tags.Pattern<"^(?=.*\\S)[\\s\\S]{1,120}$">
  >(titleTrimmed);

  const bodySource = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 6,
    sentenceMax: 12,
    wordMin: 3,
    wordMax: 10,
  });
  const bodyText = typia.assert<
    string &
      tags.MinLength<1> &
      tags.MaxLength<20000> &
      tags.Pattern<"^(?=.*\\S)[\\s\\S]{1,20000}$">
  >(bodySource);

  const post = await api.functional.civicBoard.user.posts.create(connection, {
    body: {
      title,
      body: bodyText,
    } satisfies ICivicBoardPost.ICreate,
  });
  typia.assert(post);

  // Validate the post is authored by User A
  TestValidator.equals(
    "created post author should be User A",
    post.author.id,
    userA.id,
  );

  // 3) Join as User B (non-owner)
  const userBEmail = typia.random<string & tags.Format<"email">>();
  const userBHrefRaw = typia.random<string & tags.Format<"uri">>();
  const userBHref = typia.assert<
    string & tags.Format<"uri"> & tags.MinLength<1>
  >(userBHrefRaw);
  const userBDisplayRaw = RandomGenerator.name(1);
  const userBDisplay = typia.assert<
    string & tags.MinLength<1> & tags.MaxLength<120>
  >(userBDisplayRaw);

  const userB = await api.functional.auth.user.join(connection, {
    body: {
      email: userBEmail,
      password: "P@ssw0rd!",
      display_name: userBDisplay,
      href: userBHref,
      referrer: "",
    } satisfies ICivicBoardUser.ICreate,
  });
  typia.assert(userB);

  // 4) Attempt to delete User A's post as User B → should fail
  await TestValidator.error(
    "non-owner cannot soft-delete another user's post",
    async () => {
      await api.functional.civicBoard.user.posts.erase(connection, {
        postId: post.id,
      });
    },
  );
}
