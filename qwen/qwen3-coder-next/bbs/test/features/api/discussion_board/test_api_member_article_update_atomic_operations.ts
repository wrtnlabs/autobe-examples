import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_sections_articles_create } from "../../../generate/generate_random_discussion_board_member_sections_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_member_article_update_atomic_operations(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and login
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);
  // 2. Create an article in a section (using existing section or default)
  const testSectionId =
    "00000000-0000-0000-0000-000000000001" satisfies string &
      tags.Format<"uuid">;
  const article =
    await api.functional.discussionBoard.member.sections.articles.create(
      memberConnection,
      {
        sectionId: testSectionId,
        body: {
          title: RandomGenerator.name(),
          content: RandomGenerator.content({ paragraphs: 3 }),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // 3. Test atomic update - update title and content together
  const updatedArticle =
    await api.functional.discussionBoard.member.articles.update(
      memberConnection,
      {
        articleId: article.id,
        body: {
          title: RandomGenerator.name(),
          content: RandomGenerator.content({ paragraphs: 5 }),
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(updatedArticle);
  // 4. Verify atomic update - both title and content changed together
  TestValidator.equals(
    "title updated correctly",
    updatedArticle.title,
    updatedArticle.title,
  );
  TestValidator.equals(
    "content updated correctly",
    updatedArticle.content,
    updatedArticle.content,
  );
  TestValidator.predicate(
    "updated_at is present",
    updatedArticle.updated_at !== null,
  );
  TestValidator.notEquals(
    "updated_at changed from original",
    updatedArticle.updated_at,
    article.updated_at,
  );
  // 5. Test optimistic concurrency - update again
  const finalArticle =
    await api.functional.discussionBoard.member.articles.update(
      memberConnection,
      {
        articleId: article.id,
        body: {
          title: RandomGenerator.name(),
          content: RandomGenerator.content({ paragraphs: 7 }),
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(finalArticle);
  TestValidator.notEquals(
    "concurrent update successful",
    finalArticle.updated_at,
    updatedArticle.updated_at,
  );
}
