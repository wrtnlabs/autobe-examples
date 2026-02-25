import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_article_tag_retrieval_nonexistent_tag(connection: api.IConnection): Promise<void> {
    // 1. Create user connection and register
    const userConnection: api.IConnection = { host: connection.host };
    const user = await authorize_user_join(userConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "password123",
            display_name: RandomGenerator.name(),
        } satisfies IDiscussionBoardUser.IJoin,
    });
    typia.assert(user);
    // 2. Create article with a valid section ID
    // Note: This assumes there's at least one existing section in the database
    // A better approach would be to fetch an existing section first, but since
    // there's no section listing API available, we'll proceed with the assumption
    const article = await generate_random_discussion_board_user_articles_create(userConnection, {
        body: {
            title: RandomGenerator.paragraph({ sentences: 2 }),
            content: RandomGenerator.paragraph({ sentences: 5 }),
            discussion_board_section_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IDiscussionBoardArticle.ICreate,
    });
    typia.assert(article);
    // 3. Attempt to retrieve non-existent tag
    const nonExistentTagId = typia.random<string & tags.Format<"uuid">>();
    await TestValidator.httpError("should return 404 for non-existent tag", 404, async () => {
        await api.functional.discussionBoard.user.articles.tags.at(
            userConnection,
            {
                articleId: article.id,
                tagId: nonExistentTagId,
            }
        );
    });
}