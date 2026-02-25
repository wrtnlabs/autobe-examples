import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_admin_articles_create } from "../../../generate/generate_random_discussion_board_admin_articles_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_article_creation_success_with_valid_data(connection: api.IConnection): Promise<void> {
    // 1. Create admin-specific connection and authenticate
    const adminConnection: api.IConnection = { host: connection.host };
    const admin = await authorize_admin_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            display_name: RandomGenerator.name(),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IDiscussionBoardAdmin.IJoin,
    });
    typia.assert(admin);

    // 2. Admin creates a section for the article
    const section = await api.functional.discussionBoard.admin.sections.create(adminConnection, {
        body: {
            name: RandomGenerator.paragraph({ sentences: 2 }),
            description: RandomGenerator.content({ paragraphs: 1 }),
            status: "active",
            display_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies IDiscussionBoardSection.ICreate,
    });
    typia.assert(section);

    // 3. Admin creates an article in the created section
    const articleBody = {
        title: RandomGenerator.content({ paragraphs: 1, sentenceMin: 5, sentenceMax: 8 }) satisfies string & tags.MinLength<5> & tags.MaxLength<200> as string,
        content: RandomGenerator.content({ paragraphs: 3, sentenceMin: 20, sentenceMax: 30 }) satisfies string & tags.MinLength<50> as string,
        discussion_board_section_id: section.id,
    } satisfies IDiscussionBoardArticle.ICreate;
    const article = await api.functional.discussionBoard.admin.articles.create(adminConnection, { body: articleBody });
    typia.assert(article);

    // 4. Validate article fields
    TestValidator.equals("article has valid UUID ID", typeof article.id, "string");
    TestValidator.predicate("ID is UUID format", /^[0-9a-f-]{36}$/i.test(article.id));
    TestValidator.equals("title matches input", article.title, articleBody.title);
    TestValidator.equals("content matches input", article.content, articleBody.content);
    TestValidator.equals("status is published", article.status, "published");
    TestValidator.equals("section ID matches", article.section.id, section.id);
    TestValidator.equals("author ID matches admin ID", article.author.id, admin.id);
    TestValidator.predicate("created_at is valid ISO date", /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(article.created_at));
    TestValidator.predicate("updated_at is valid ISO date", /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(article.updated_at));
    TestValidator.equals("deleted_at is null", article.deleted_at, null);
}