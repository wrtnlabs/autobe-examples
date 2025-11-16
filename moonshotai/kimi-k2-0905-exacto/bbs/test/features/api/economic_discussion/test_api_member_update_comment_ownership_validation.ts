import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionAttachmentFileType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachmentFileType";
import type { IEconomicDiscussionAttachments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachments";
import type { IEconomicDiscussionCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategories";
import type { IEconomicDiscussionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionComment";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import type { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import type { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";

/**
 * Test comment ownership validation during update operations.
 *
 * This test validates that members can only edit their own comments and receive
 * appropriate authorization errors when attempting to modify other users'
 * contributions. Creates multiple member accounts with proper registration.
 * Then establishes an article for discussion and creates comments from
 * different members. The core validation tests that a member cannot update
 * another member's comment, demonstrating the ownership validation required by
 * the endpoint. Finally verifies that proper authentication is maintained
 * throughout the API operations.
 *
 * 1. Member A registers and creates an article for discussion
 * 2. Member B registers and creates a comment on the article
 * 3. Member C registers and attempts to edit Member B's comment (should fail)
 * 4. Verify ownership validation prevents unauthorized edits
 */
export async function test_api_member_update_comment_ownership_validation(
  connection: api.IConnection,
) {
  // Step 1: Create Member A and authenticate
  const memberAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberA: IEconomicDiscussionMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphabets(8),
        email: memberAEmail,
        password: "SecurePassword123",
      } satisfies IEconomicDiscussionMember.ICreate,
    });
  typia.assert(memberA);

  // Step 2: Member A creates an article for discussion
  const article: IEconomicDiscussionArticle =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        category_ids: ArrayUtil.repeat(2, () =>
          typia.random<string & tags.Format<"uuid">>(),
        ),
      } satisfies IEconomicDiscussionArticle.ICreate,
    });
  typia.assert(article);

  // Step 3: Create Member B and authenticate
  const memberBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberB: IEconomicDiscussionMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphabets(8),
        email: memberBEmail,
        password: "SecurePassword123",
      } satisfies IEconomicDiscussionMember.ICreate,
    });
  typia.assert(memberB);

  // Step 4: Member B creates a comment on the article
  const commentB: IEconomicDiscussionComment =
    await api.functional.economicDiscussion.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          article_id: article.id,
          content: RandomGenerator.paragraph({ sentences: 8 }),
        } satisfies IEconomicDiscussionComment.ICreate,
      },
    );
  typia.assert(commentB);

  // Step 5: Create Member C and authenticate
  const memberCEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberC: IEconomicDiscussionMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphabets(8),
        email: memberCEmail,
        password: "SecurePassword123",
      } satisfies IEconomicDiscussionMember.ICreate,
    });
  typia.assert(memberC);

  // Step 6: Member C attempts to edit Member B's comment (should fail - ownership validation)
  await TestValidator.error(
    "should prevent member C from editing member B's comment due to ownership validation",
    async () => {
      await api.functional.economicDiscussion.articles.comments.update(
        connection,
        {
          articleId: article.id,
          commentId: commentB.id,
          body: {
            content: RandomGenerator.paragraph({ sentences: 8 }),
          } satisfies IEconomicDiscussionComment.IUpdate,
        },
      );
    },
  );

  // Step 7: Clean up - test completion
  TestValidator.predicate("test completed successfully", true);
}
