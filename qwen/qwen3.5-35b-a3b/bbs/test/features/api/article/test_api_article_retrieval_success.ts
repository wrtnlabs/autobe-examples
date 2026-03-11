import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import type { IEconomicPoliticalBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAttachment";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import type { IEconomicPoliticalBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardSection";
import type { IEconomicPoliticalBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardTag";
import { prepare_random_economic_political_board_attachment } from "../../../prepare/prepare_random_economic_political_board_attachment";
import { prepare_random_economic_political_board_article } from "../../../prepare/prepare_random_economic_political_board_article";
import { generate_random_economic_political_board_member_articles_create } from "../../../generate/generate_random_economic_political_board_member_articles_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_article_retrieval_success(connection: api.IConnection): Promise<void> {
    // 1. Create member account with authentication
    const memberConnection: api.IConnection = { host: connection.host };
    const memberAuth = await authorize_member_join(memberConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            name: RandomGenerator.name(),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IEconomicPoliticalBoardMember.IJoin,
    });
    typia.assert(memberAuth);
    // 2. Create article with tags and attachments using member connection
    const articleCreateBody: IEconomicPoliticalBoardArticle.ICreate = {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        sectionId: typia.random<string & tags.Format<"uuid">>(),
        tags: ArrayUtil.repeat(2, () => typia.random<string & tags.Pattern<"^[a-zA-Z0-9-]+$">>()),
        attachments: [
            {
                file_url: typia.random<string & tags.Format<"uri">>(),
                file_name: "test_image.png",
                file_type: "image" as "image" | "file",
            },
        ],
    } satisfies IEconomicPoliticalBoardArticle.ICreate;
    const article = await generate_random_economic_political_board_member_articles_create({ host: connection.host }, { body: articleCreateBody });
    typia.assert(article);
    // 3. Retrieve article by ID (public endpoint, no authentication required)
    const retrievedArticle = await api.functional.economicPoliticalBoard.articles.at({ host: connection.host }, {
        articleId: article.id,
    });
    typia.assert(retrievedArticle);
    // 4. Validate article structure and metadata
    TestValidator.equals("article id matches", retrievedArticle.id, article.id);
    TestValidator.equals("article title matches", retrievedArticle.title, article.title);
    TestValidator.equals("article content matches", retrievedArticle.content, article.content);
    // Validate author information
    TestValidator.equals("author id matches", retrievedArticle.author.id, article.author.id);
    TestValidator.equals("author display name matches", retrievedArticle.author.displayName, article.author.displayName);
    // Validate section information
    TestValidator.equals("section id matches", retrievedArticle.section.id, article.section.id);
    TestValidator.equals("section name matches", retrievedArticle.section.name, article.section.name);
    // Validate tags
    TestValidator.equals("tags count matches", retrievedArticle.tags.length, article.tags.length);
    if (retrievedArticle.tags.length > 0) {
        TestValidator.equals("first tag name present", retrievedArticle.tags[0].name, article.tags[0].name);
        TestValidator.predicate("first tag article count non-negative", retrievedArticle.tags[0].article_count >= 0);
    }
    // Validate attachments
    TestValidator.equals("attachments count matches", retrievedArticle.attachments.length, article.attachments.length);
    if (retrievedArticle.attachments.length > 0) {
        TestValidator.equals("first attachment file url present", retrievedArticle.attachments[0].fileUrl, article.attachments[0].fileUrl);
        TestValidator.equals("first attachment file name present", retrievedArticle.attachments[0].fileName, article.attachments[0].fileName);
        TestValidator.equals("first attachment file type present", retrievedArticle.attachments[0].fileType, article.attachments[0].fileType);
        TestValidator.equals("first attachment parent article id matches", retrievedArticle.attachments[0].article.id, retrievedArticle.id);
    }
    // Validate timestamps are in correct format
    const createdDate = new Date(retrievedArticle.created_at);
    const updatedDate = new Date(retrievedArticle.updated_at);
    TestValidator.predicate("created_at is valid date", !isNaN(createdDate.getTime()));
    TestValidator.predicate("updated_at is valid date", !isNaN(updatedDate.getTime()));
    // Validate comment count
    TestValidator.equals("comment count matches", retrievedArticle.comment_count, article.comment_count);
    TestValidator.predicate("comment count is non-negative", retrievedArticle.comment_count >= 0);
    // Validate deleted_at is null for active article
    TestValidator.equals("article not deleted", retrievedArticle.deleted_at, null);
}