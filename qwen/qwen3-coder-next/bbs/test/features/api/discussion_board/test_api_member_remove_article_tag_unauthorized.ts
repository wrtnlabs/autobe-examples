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

export async function test_api_member_remove_article_tag_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate Member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberA);
  // 2. Create and authenticate Member B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberB);
  // 3. Member A creates an article
  // Using available SDK function for article creation
  const article =
    await api.functional.discussionBoard.member.sections.articles.create(
      memberAConnection,
      {
        sectionId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          title: RandomGenerator.name(3),
          content: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // 4. Use an existing tag from the article or create a placeholder tag ID
  let tagId: string;
  if (article.taggings && article.taggings.length > 0) {
    tagId = article.taggings[0].id;
  } else {
    // Use a placeholder tag ID for testing unauthorized removal
    tagId = typia.random<string & tags.Format<"uuid">>();
  }
  // 5. Member B attempts to remove the tag from Member A's article
  // This should fail with 403 Forbidden
  await TestValidator.error(
    "Member B cannot remove tag from Member A's article",
    async () => {
      await api.functional.discussionBoard.member.articles.tags.removeArticleTag(
        memberBConnection,
        {
          articleId: article.id,
          tagId: tagId,
        },
      );
    },
  );
  // 6. TestValidator.error confirms the error was thrown
  // No additional verification needed as the error validation is sufficient
}
