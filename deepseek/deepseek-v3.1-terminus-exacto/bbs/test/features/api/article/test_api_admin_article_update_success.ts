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
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { generate_random_discussion_board_admin_articles_create } from "../../../generate/generate_random_discussion_board_admin_articles_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_article_update_success(connection: api.IConnection): Promise<void> {
    // 1. Authenticate as admin
    const adminConnection: api.IConnection = { host: connection.host };
    const admin = await authorize_admin_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "admin1234",
            display_name: RandomGenerator.name(),
            href: "http://localhost:3000",
            referrer: "http://localhost:3000",
            ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IDiscussionBoardAdmin.IJoin,
    });
    typia.assert(admin);

    // 2. Create a test article
    const articleBody = {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 1, sentenceMin: 5, sentenceMax: 8 }),
        discussion_board_section_id: typia.random<string & tags.Format<"uuid">>(),
    } satisfies IDiscussionBoardArticle.ICreate;
    const originalArticle = await api.functional.discussionBoard.admin.articles.create(adminConnection, {
        body: articleBody,
    });
    typia.assert(originalArticle);

    // 3. Update the article with new content
    const updateBody = {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        content: RandomGenerator.content({ paragraphs: 2, sentenceMin: 3, sentenceMax: 6 }),
    } satisfies IDiscussionBoardArticle.IUpdate;
    const updatedArticle = await api.functional.discussionBoard.admin.articles.update(adminConnection, {
        articleId: originalArticle.id,
        body: updateBody,
    });
    typia.assert(updatedArticle);

    // 4. Validate the update was successful
    TestValidator.equals("article id remains the same", updatedArticle.id, originalArticle.id);
    TestValidator.equals("title is updated", updatedArticle.title, updateBody.title!);
    TestValidator.equals("content is updated", updatedArticle.content, updateBody.content!);
    TestValidator.equals("author remains the same", updatedArticle.author.id, originalArticle.author.id);
    TestValidator.equals("section remains the same", updatedArticle.section.id, originalArticle.section.id);
    TestValidator.predicate("updated_at is later than created_at", new Date(updatedArticle.updated_at) > new Date(originalArticle.created_at));
}