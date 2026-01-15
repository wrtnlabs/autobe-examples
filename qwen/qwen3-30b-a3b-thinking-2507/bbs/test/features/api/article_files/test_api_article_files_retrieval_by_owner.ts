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
import type { IDiscussionBoardArticleFileDisplayInfo } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFileDisplayInfo";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleFile";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_article_files_retrieval_by_owner(connection: api.IConnection): Promise<void> {
    // Create member-specific connection
    const memberConnection: api.IConnection = { host: connection.host };
    
    // Register as member using utility function
    const member: IDiscussionBoardMember.IAuthorized = await authorize_member_join(memberConnection, {
        body: {
            href: "https://example.com",
            referrer: "https://example.com",
            ip: "127.0.0.1",
        },
    });
    
    // Create test article with proper requirements (title and content min 50 chars)
    const article: IDiscussionBoardArticle = await generate_random_discussion_board_member_articles_create(memberConnection, {
        body: {
            title: RandomGenerator.paragraph({ sentences: 6, wordMin: 9, wordMax: 10 }) satisfies IDiscussionBoardArticle.ICreate["title"],
            content: RandomGenerator.content({
                paragraphs: 2,
                sentenceMin: 10,
                sentenceMax: 15,
                wordMin: 5,
                wordMax: 10
            }) satisfies IDiscussionBoardArticle.ICreate["content"],
        },
    });
    
    // Retrieve article file attachments
    const files: IPageIDiscussionBoardArticleFile.ISummary = await api.functional.discussionBoard.member.articles.files.patchByArticleid(memberConnection, {
        articleId: article.id,
        body: {
            // Correct usage of satisfies
        } satisfies IDiscussionBoardArticleFile.IRequest,
    });
    
    // Validate the file retrieval response
    TestValidator.equals("member should see no files initially for article", files.data.length, 0);
    typia.assert(files); }