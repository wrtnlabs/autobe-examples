import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardNotificationFailure } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotificationFailure";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

export async function test_api_notification_failure_retrieval_not_found(
  connection: api.IConnection,
) {
  /**
   * Validate that requesting a non-existent notification failure attempt for an
   * authenticated member results in an error (expected 404 behavior).
   *
   * Steps:
   *
   * 1. Register a new member via POST /auth/member/join (IAttempt to get auth)
   * 2. Optionally create an article to provide contextual resources
   * 3. Attempt to retrieve a delivery failure record that does NOT exist
   * 4. Assert that the retrieval call throws (TestValidator.error)
   */

  // 1) Member registration (join)
  const joinBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongPassw0rd!", // >= 12 characters
    display_name: RandomGenerator.name(),
    href: "https://example.com/home",
    referrer: "https://example.com/",
  } satisfies IDiscussionBoardMember.IJoin;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: joinBody });
  typia.assert(member);
  TestValidator.predicate("member has username", member.username.length > 0);

  // 2) Optional: create an article to provide context (not required for the 404 behavior)
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 5, wordMax: 10 }),
    content: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleBody,
    });
  typia.assert(article);

  // 3) Attempt to retrieve a non-existent failure record
  const randomNotificationId = typia.random<string & tags.Format<"uuid">>();
  const randomAttemptNumber = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();

  await TestValidator.error(
    "retrieving non-existent notification failure should error",
    async () => {
      await api.functional.discussionBoard.member.members.notifications.failures.at(
        connection,
        {
          memberUsername: member.username,
          notificationId: randomNotificationId,
          attemptNumber: randomAttemptNumber,
        },
      );
    },
  );
}
