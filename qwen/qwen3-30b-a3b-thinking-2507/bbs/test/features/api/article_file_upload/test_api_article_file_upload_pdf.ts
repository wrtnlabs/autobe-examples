import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { generate_random_discussion_board_member_articles_files_post_by_articlecode } from "../../../generate/generate_random_discussion_board_member_articles_files_post_by_articlecode";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_article_file_upload_pdf(connection: api.IConnection): Promise<void> {
    // 1. Create a new member account
    const memberConnection: api.IConnection = { host: connection.host };
    await authorize_member_join(memberConnection, {
        body: {
            href: `https://app.example.com/article-upload/${RandomGenerator.alphaNumeric(8)}`,
            referrer: `https://app.example.com/${RandomGenerator.alphaNumeric(8)}`,
            ip: null,
        },
    });

    // 2. Create a new discussion board article
    const article: IDiscussionBoardArticle = await generate_random_discussion_board_member_articles_create(memberConnection, {
        body: {
            title: RandomGenerator.paragraph({ sentences: 3 }),
            content: RandomGenerator.content({ paragraphs: 1 }),
        },
    });
    typia.assert(article);

    // 3. Upload PDF file to the article
    const file: IDiscussionBoardArticleFile = await generate_random_discussion_board_member_articles_files_post_by_articlecode(memberConnection, {
        params: {
            articleCode: article.code,
        },
        body: {
            mime_type: "application/pdf",
            size: 1024,
            name: `report_${RandomGenerator.alphaNumeric(8)}.pdf`,
            uri: `https://storage.example.com/files/${article.code}/report_${RandomGenerator.alphaNumeric(8)}.pdf`,
            extension: "pdf",
        },
    });
    typia.assert(file);

    // 4. Verify correct MIME type handling
    TestValidator.equals("MIME type should be application/pdf", file.mime_type, "application/pdf");

    // 5. Verify PDF file association with article
    TestValidator.equals("file should be associated with the correct article", file.article_code, article.code);
}