import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import type { IEconomicPoliticalBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAttachment";
import type { IEconomicPoliticalBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardComment";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import type { IEconomicPoliticalBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardSection";
import type { IEconomicPoliticalBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_economic_political_board_member_articles_comments_create } from "../../../generate/generate_random_economic_political_board_member_articles_comments_create";
import { generate_random_economic_political_board_member_articles_create } from "../../../generate/generate_random_economic_political_board_member_articles_create";
import { prepare_random_economic_political_board_article } from "../../../prepare/prepare_random_economic_political_board_article";
import { prepare_random_economic_political_board_attachment } from "../../../prepare/prepare_random_economic_political_board_attachment";
import { prepare_random_economic_political_board_comment } from "../../../prepare/prepare_random_economic_political_board_comment";

/**
 * Test that comment creation works correctly within the context of existing discussions,
 * validating chronological ordering behavior.
 *
 * 1. Member authenticates by joining the system
 * 2. Member creates an article for the discussion
 * 3. Member posts first comment with specific content text
 * 4. Member posts second comment with different content text immediately after
 * 5. System creates both comments with the same member as author
 * 6. Each comment receives unique UUID, same article association, and sequential timestamps
 * 7. First comment should have earlier created_at than second comment
 * 8. System should maintain single-level comment structure (no nested replies)
 *
 * Key validations: Both comments are successfully created, timestamps are sequential in creation order,
 * comments are associated with the correct article and author, chronological ordering is preserved.
 */
export async function test_api_comment_chronological_ordering_integration(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Member registration
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicPoliticalBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // Step 2: Member creates article for discussion
  const article =
    await api.functional.economicPoliticalBoard.member.articles.create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 1 }),
          sectionId: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IEconomicPoliticalBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // Step 3: Post first comment
  const firstComment =
    await api.functional.economicPoliticalBoard.member.articles.comments.create(
      memberConnection,
      {
        articleId: article.id,
        body: {
          content: "First comment content - initial discussion point",
        } satisfies IEconomicPoliticalBoardComment.ICreate,
      },
    );
  typia.assert(firstComment);
  // Step 4: Post second comment immediately after
  const secondComment =
    await api.functional.economicPoliticalBoard.member.articles.comments.create(
      memberConnection,
      {
        articleId: article.id,
        body: {
          content: "Second comment content - follow-up discussion point",
        } satisfies IEconomicPoliticalBoardComment.ICreate,
      },
    );
  typia.assert(secondComment);
  // Step 5: Validate comments have unique IDs
  TestValidator.notEquals(
    "comments have unique IDs",
    firstComment.id,
    secondComment.id,
  );
  // Step 6: Validate both comments associated with same article
  TestValidator.equals(
    "first comment article matches",
    firstComment.article.id,
    article.id,
  );
  TestValidator.equals(
    "second comment article matches",
    secondComment.article.id,
    article.id,
  );
  // Step 7: Validate both comments have same author
  TestValidator.equals(
    "first comment author matches",
    firstComment.author.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "second comment author matches",
    secondComment.author.id,
    memberAuth.id,
  );
  // Step 8: Validate timestamps are strictly sequential
  TestValidator.predicate(
    "first comment created_at is earlier than second comment",
    firstComment.created_at < secondComment.created_at,
  );
  // Step 9: Validate different content
  TestValidator.notEquals(
    "comments have different content",
    firstComment.content,
    secondComment.content,
  );
  // Step 10: Validate comment structure - single level (no nesting in this system)
  // Both comments are top-level discussion entries and active
  TestValidator.predicate(
    "first comment is active",
    firstComment.deleted_at === null,
  );
  TestValidator.predicate(
    "second comment is active",
    secondComment.deleted_at === null,
  );
  // Step 11: Validate comment metadata consistency
  TestValidator.equals(
    "first comment updated_at matches created_at",
    firstComment.updated_at,
    firstComment.created_at,
  );
  TestValidator.equals(
    "second comment updated_at matches created_at",
    secondComment.updated_at,
    secondComment.created_at,
  );
  // Step 12: Validate comment IDs are valid UUIDs
  TestValidator.predicate(
    "first comment id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      firstComment.id,
    ),
  );
  TestValidator.predicate(
    "second comment id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      secondComment.id,
    ),
  );
  // Step 13: Validate article IDs are valid UUIDs
  TestValidator.predicate(
    "article id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      article.id,
    ),
  );
  TestValidator.predicate(
    "member auth id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      memberAuth.id,
    ),
  );
}
