import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSubscription";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Validate retrieving a non-existent subscription returns an error.
 *
 * Business purpose:
 *
 * - Ensure the subscription retrieval endpoint treats absent subscriptions as
 *   not-found and rejects requests that reference malformed UUIDs.
 *
 * Steps:
 *
 * 1. Register a new discussion board member (POST /auth/member/join).
 * 2. Create an article as that member (POST /discussionBoard/member/articles).
 * 3. Attempt to GET the subscription for the created article (no subscription was
 *    created) and assert that the call throws.
 * 4. Attempt to GET the subscription with a malformed UUID and assert an error is
 *    thrown.
 */
export async function test_api_subscription_retrieval_not_found(
  connection: api.IConnection,
) {
  // 1) Create a new member (registration)
  const username = RandomGenerator.alphaNumeric(8); // alphanumeric username
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12); // minimum 12 chars
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username,
      email,
      password,
      href,
      referrer,
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);

  // 2) Create an article as the authenticated member
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 6,
          wordMin: 5,
          wordMax: 10,
        }),
        content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // 3) Attempt to retrieve a subscription that does not exist
  await TestValidator.error(
    "retrieving non-existent subscription should throw",
    async () => {
      await api.functional.discussionBoard.member.members.subscriptions.at(
        connection,
        {
          memberUsername: member.username,
          targetType: "article",
          targetId: article.id,
        },
      );
    },
  );

  // 4) Attempt to retrieve with malformed UUID for targetId
  await TestValidator.error(
    "malformed targetId should be rejected",
    async () => {
      await api.functional.discussionBoard.member.members.subscriptions.at(
        connection,
        {
          memberUsername: member.username,
          targetType: "article",
          targetId: "not-a-uuid",
        },
      );
    },
  );
}
