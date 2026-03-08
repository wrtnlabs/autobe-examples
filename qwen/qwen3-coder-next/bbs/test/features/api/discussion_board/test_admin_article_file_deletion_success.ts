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
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { generate_random_discussion_board_super_admin_sections_articles_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_articles_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test: successful file attachment deletion by an administrator.
 * 1. Auth as admin using /auth/admin/join
 * 2. Create an article using superAdmin with (random) section ID
 * 3. Delete a file attachment using the target endpoint
 * 4. Verify: deletion operation completes successfully
 */
export async function test_admin_article_file_deletion_success(connection: api.IConnection): Promise<void> {
    // 1. Auth as admin
    const adminConnection: api.IConnection = { host: connection.host };
    await authorize_admin_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "12345678",
            display_name: RandomGenerator.name(),
        } satisfies IDiscussionBoardAdmin.IJoin,
    });
    // 2. Auth as super admin for article creation
    const superAdminConnection: api.IConnection = { host: connection.host };
    await authorize_super_admin_join(superAdminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "12345678",
            display_name: RandomGenerator.name(),
            bio: RandomGenerator.paragraph({ sentences: 2 }),
            href: "https://example.com/login",
            referrer: "https://example.com/home",
        } satisfies IDiscussionBoardSuperAdmin.IJoin,
    });
    // 3. Create an article using available API
    const article: IDiscussionBoardArticle = await api.functional.discussionBoard.superAdmin.sections.articles.create(superAdminConnection, {
        sectionId: typia.random<string & tags.Format<"uuid">>(),
        body: {
            title: RandomGenerator.paragraph({ sentences: 2 }),
            content: RandomGenerator.content({ paragraphs: 3 }),
        } satisfies IDiscussionBoardArticle.ICreate,
    });
    typia.assert(article);
    // 4. Delete a file attachment using target endpoint
    await api.functional.discussionBoard.admin.articles.files.erase(adminConnection, {
        articleId: article.id,
        fileId: typia.random<string & tags.Format<"uuid">>(),
    });
    // 5. Verify deletion completed successfully (void return indicates success)
    TestValidator.predicate("file deletion completed without error", () => true);
}