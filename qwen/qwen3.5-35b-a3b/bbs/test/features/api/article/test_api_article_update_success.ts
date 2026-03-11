import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import type { IEconomicPoliticalBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAttachment";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import type { IEconomicPoliticalBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardSection";
import type { IEconomicPoliticalBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicPoliticalBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalBoardTag";
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
import { prepare_random_economic_political_board_attachment } from "../../../prepare/prepare_random_economic_political_board_attachment";

export async function test_api_article_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member
  const joinConnection: api.IConnection = { host: connection.host };
  const member: IEconomicPoliticalBoardMember.IAuthorized =
    await authorize_member_join(joinConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  typia.assert(member);
  // 2. Create initial article
  const articleConnection: api.IConnection = { host: connection.host };
  const initialArticle: IEconomicPoliticalBoardArticle =
    await api.functional.economicPoliticalBoard.member.articles.create(
      articleConnection,
      {
        body: {
          title: "Initial Article Title",
          content: "This is the initial article content.",
          sectionId: typia.random<string & tags.Format<"uuid">>(),
          tags: ["initial", "test"],
          attachments: [
            {
              file_url: "https://example.com/file1.jpg",
              file_name: "image1.jpg",
              file_type: "image" as const,
            },
          ] satisfies IEconomicPoliticalBoardAttachment.ICreate[],
        } satisfies IEconomicPoliticalBoardArticle.ICreate,
      },
    );
  typia.assert(initialArticle);
  // 3. Get available tags for the update
  const tagsResponse: IPageIEconomicPoliticalBoardTag.ISummary =
    await api.functional.economicPoliticalBoard.tags.index(articleConnection, {
      body: {},
    });
  typia.assert(tagsResponse);
  // 4. Extract tag names from response
  const tagNames: string[] = tagsResponse.data
    .map((tag) => tag.name)
    .slice(0, 3);
  // 5. Create new attachments for update using IManage format
  const newAttachments: IEconomicPoliticalBoardAttachment.IManage[] = [
    {
      operations: [
        {
          action: "add" as const,
          fileUrl: "https://example.com/updated-file1.png",
          fileName: "updated-image1.png",
          fileType: "image" as const,
        },
      ],
    },
  ] satisfies IEconomicPoliticalBoardAttachment.IManage[];
  // 6. Update the article
  const updatedArticle: IEconomicPoliticalBoardArticle =
    await api.functional.economicPoliticalBoard.member.articles.update(
      articleConnection,
      {
        articleId: initialArticle.id,
        body: {
          title: "Updated Article Title",
          content: "This is the updated article content with more details.",
          tags: tagNames,
          attachments: newAttachments,
        } satisfies IEconomicPoliticalBoardArticle.IUpdate,
      },
    );
  typia.assert(updatedArticle);
  // 7. Verify update response
  TestValidator.equals(
    "article title updated",
    updatedArticle.title,
    "Updated Article Title",
  );
  TestValidator.equals(
    "article content updated",
    updatedArticle.content,
    "This is the updated article content with more details.",
  );
  TestValidator.equals("author preserved", updatedArticle.author.id, member.id);
  TestValidator.equals(
    "section preserved",
    updatedArticle.section.id,
    initialArticle.section.id,
  );
  TestValidator.equals(
    "comment count unchanged",
    updatedArticle.comment_count,
    initialArticle.comment_count,
  );
  TestValidator.equals(
    "tags count updated",
    updatedArticle.tags.length,
    tagNames.length,
  );
  TestValidator.predicate(
    "tags match",
    updatedArticle.tags.every((tag) => tagNames.includes(tag.name)),
  );
  TestValidator.equals(
    "updated_at newer than created",
    updatedArticle.updated_at > initialArticle.created_at,
    true,
  );
  // 8. Verify persistence by re-fetching with minimal update
  const reloadedArticle: IEconomicPoliticalBoardArticle =
    await api.functional.economicPoliticalBoard.member.articles.update(
      articleConnection,
      {
        articleId: initialArticle.id,
        body: {},
      },
    );
  typia.assert(reloadedArticle);
  TestValidator.equals(
    "persistence title",
    reloadedArticle.title,
    "Updated Article Title",
  );
  TestValidator.equals(
    "persistence tags",
    reloadedArticle.tags.length,
    tagNames.length,
  );
}
