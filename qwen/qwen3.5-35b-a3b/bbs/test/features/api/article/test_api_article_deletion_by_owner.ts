import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import type { IEconomicPoliticalBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticleAttachment";
import type { IEconomicPoliticalBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAttachment";
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
import { generate_random_economic_political_board_member_articles_create } from "../../../generate/generate_random_economic_political_board_member_articles_create";
import { prepare_random_economic_political_board_article } from "../../../prepare/prepare_random_economic_political_board_article";
import { prepare_random_economic_political_board_article_attachment } from "../../../prepare/prepare_random_economic_political_board_article_attachment";

export async function test_api_article_deletion_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member setup
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Create article with attachments and tags
  const tag1 = typia.random<string & tags.Format<"uuid">>();
  const tag2 = typia.random<string & tags.Format<"uuid">>();
  const article =
    await api.functional.economicPoliticalBoard.member.articles.create(
      memberConnection,
      {
        body: {
          title: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<500>
          >(),
          content: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<50000>
          >(),
          section_id: typia.random<string & tags.Format<"uuid">>(),
          tagIds: [tag1, tag2],
          attachmentData: [
            {
              file_url: typia.random<string & tags.Format<"uri">>(),
              file_name: RandomGenerator.name(2) + ".pdf",
              file_type: "file",
            },
            {
              file_url: typia.random<string & tags.Format<"uri">>(),
              file_name: RandomGenerator.name(2) + ".jpg",
              file_type: "image",
            },
          ],
        },
      },
    );
  typia.assert(article);
  // 3. Verify article structure before deletion
  TestValidator.equals(
    "article has 2 attachments",
    article.attachments.length,
    2,
  );
  TestValidator.equals("article has 2 tags", article.tags.length, 2);
  // 4. Verify author matches current member
  TestValidator.equals(
    "article author matches member id",
    article.author.userId,
    member.id,
  );
  // 5. Delete the article
  await api.functional.economicPoliticalBoard.member.articles.erase(
    memberConnection,
    { articleId: article.id },
  );
  // 6. Verify article cannot be deleted again (should return 404)
  await TestValidator.httpError(
    "deleted article returns 404 on second deletion",
    404,
    async () => {
      await api.functional.economicPoliticalBoard.member.articles.erase(
        memberConnection,
        { articleId: article.id },
      );
    },
  );
  // 7. Verify article has soft-deleted timestamp
  TestValidator.predicate(
    "article is soft-deleted",
    article.deleted_at !== null,
  );
}
