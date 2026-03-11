import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
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
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
/**
 * Test admin's ability to update an article with complete metadata replacement
 * including title, content, tags, and attachments.
 */
export async function test_api_admin_article_update_complete_metadata(connection: api.IConnection): Promise<void> {
    // 1. Generate test credentials
    const adminEmail = typia.random<string & tags.Format<"email">>();
    const adminPassword = RandomGenerator.alphaNumeric(16);
    const memberEmail = typia.random<string & tags.Format<"email">>();
    const memberPassword = RandomGenerator.alphaNumeric(16);
    // 2. Register admin user
    const adminJoinConnection: api.IConnection = { host: connection.host };
    const adminAuthorized = await authorize_admin_join(adminJoinConnection, {
        body: {
            email: adminEmail,
            password: adminPassword,
            displayName: RandomGenerator.name(),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        },
    });
    typia.assert(adminAuthorized);
    const adminConnection: api.IConnection = { host: connection.host };
    await authorize_admin_login(adminConnection, {
        body: {
            email: adminEmail,
            password: adminPassword,
        },
    });
    // 3. Register member user
    const memberJoinConnection: api.IConnection = { host: connection.host };
    const memberAuthorized = await authorize_member_join(memberJoinConnection, {
        body: {
            email: memberEmail,
            password: memberPassword,
            name: RandomGenerator.name(),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        },
    });
    typia.assert(memberAuthorized);
    const memberConnection: api.IConnection = { host: connection.host };
    await authorize_member_login(memberConnection, {
        body: {
            email: memberEmail,
            password: memberPassword,
        },
    });
    // 4. Create section for article
    const sectionId = typia.random<string & tags.Format<"uuid">>();
    // 5. Create initial article with tags and attachments
    const initialTags = ["initial-tag-1", "initial-tag-2"];
    const initialAttachments = [
        {
            file_url: "https://example.com/file1.jpg",
            file_name: "file1.jpg",
            file_type: "image" as "image" | "file",
        },
    ];
    const initialArticle = await api.functional.economicPoliticalBoard.member.articles.create(memberConnection, {
        body: {
            title: RandomGenerator.paragraph({ sentences: 3 }),
            content: RandomGenerator.content({ paragraphs: 2 }),
            sectionId,
            tags: initialTags,
            attachments: initialAttachments,
        } satisfies IEconomicPoliticalBoardArticle.ICreate,
    });
    typia.assert(initialArticle);
    // 6. Update article as admin with complete metadata replacement
    const newTitle = RandomGenerator.paragraph({ sentences: 5 });
    const newContent = RandomGenerator.content({ paragraphs: 5 });
    const newTags = ["new-tag-1", "new-tag-2", "new-tag-3"];
    const newAttachments = [
        {
            file_url: "https://example.com/file2.png",
            file_name: "file2.png",
            file_type: "image" as "image" | "file",
        },
        {
            file_url: "https://example.com/document.pdf",
            file_name: "document.pdf",
            file_type: "file" as "image" | "file",
        },
    ];
    const updatedArticle = await api.functional.economicPoliticalBoard.admin.articles.update(adminConnection, {
        articleId: initialArticle.id,
        body: {
            title: newTitle,
            content: newContent,
            tags: newTags,
            attachments: newAttachments.map((attachment) => ({
                ...attachment,
                operations: ["create"] as const,
            })),
        } satisfies IEconomicPoliticalBoardArticle.IUpdate,
    });
    typia.assert(updatedArticle);
    // 7. Validate updates
    TestValidator.equals("title updated", updatedArticle.title, newTitle);
    TestValidator.equals("content updated", updatedArticle.content, newContent);
    TestValidator.equals("tags replaced (count)", updatedArticle.tags.length, newTags.length);
    TestValidator.equals("attachments replaced (count)", updatedArticle.attachments.length, newAttachments.length);
    TestValidator.equals("author unchanged", updatedArticle.author.id, memberAuthorized.id);
    TestValidator.equals("section unchanged", updatedArticle.section.id, sectionId);
    TestValidator.predicate("updated_at changed", updatedArticle.updated_at !== initialArticle.updated_at);
    // 8. Verify tag names are correct
    for (const tag of newTags) {
        const tagExists = updatedArticle.tags.some((t) => t.name === tag);
        TestValidator.predicate(`new tag ${tag} exists`, tagExists);
    }
    // 9. Verify attachment details
    TestValidator.equals("first attachment URL", updatedArticle.attachments[0].fileUrl, newAttachments[0].file_url);
    TestValidator.equals("second attachment file name", updatedArticle.attachments[1].fileName, newAttachments[1].file_name);
}