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

export async function test_api_admin_article_update_status_transition(connection: api.IConnection): Promise<void> {
    // Setup admin authentication
    const adminConnection: api.IConnection = { host: connection.host };
    await authorize_admin_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "TestPassword123!",
            display_name: RandomGenerator.name(),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>()
        } satisfies IDiscussionBoardAdmin.IJoin,
    });

    // Create initial article (status determined by server)
    const initialArticle = await generate_random_discussion_board_admin_articles_create(adminConnection, {
        body: {
            title: RandomGenerator.paragraph({ sentences: 2 }),
            content: RandomGenerator.content({ paragraphs: 3 }),
            discussion_board_section_id: typia.random<string & tags.Format<"uuid">>()
        } satisfies IDiscussionBoardArticle.ICreate,
    });
    typia.assert(initialArticle);

    // Capture initial status for validation
    const initialStatus = initialArticle.status;

    // Test all valid status transitions
    const validStatuses = ["draft", "published", "archived"] as const;
    for (const targetStatus of validStatuses) {
        if (targetStatus !== initialStatus) {
            const updatedArticle = await api.functional.discussionBoard.admin.articles.update(adminConnection, {
                articleId: initialArticle.id,
                body: {
                    status: targetStatus,
                } satisfies IDiscussionBoardArticle.IUpdate,
            });
            typia.assert(updatedArticle);
            TestValidator.equals(`status transition to ${targetStatus}`, updatedArticle.status, targetStatus);
            TestValidator.equals(`title preserved after ${targetStatus}`, updatedArticle.title, initialArticle.title);
            TestValidator.equals(`content preserved after ${targetStatus}`, updatedArticle.content, initialArticle.content);
            TestValidator.equals(`author preserved after ${targetStatus}`, updatedArticle.author.id, initialArticle.author.id);
        }
    }

    // Test that content updates work alongside status changes
    const finalUpdate = await api.functional.discussionBoard.admin.articles.update(adminConnection, {
        articleId: initialArticle.id,
        body: {
            title: RandomGenerator.paragraph({ sentences: 2 }),
            content: RandomGenerator.content({ paragraphs: 2 }),
            status: RandomGenerator.pick(["draft", "published"]) as "draft" | "published" | "archived"
        } satisfies IDiscussionBoardArticle.IUpdate,
    });
    typia.assert(finalUpdate);
    TestValidator.notEquals("title updated", finalUpdate.title, initialArticle.title);
    TestValidator.notEquals("content updated", finalUpdate.content, initialArticle.content);
}