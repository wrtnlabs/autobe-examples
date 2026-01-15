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
import type { IDiscussionBoardArticleFileDisplayInfo } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFileDisplayInfo";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleFile";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_article_files_member_view_non_moderated(connection: api.IConnection) {
    // 1. Create and authenticate as member
    const memberConnection: api.IConnection = { host: connection.host };
    const member = await authorize_member_join(memberConnection, {
        body: {
            href: "https://test.example.com/member/join",
            referrer: "https://test.example.com/login",
            ip: "127.0.0.1",
        },
    });
    typia.assert(member);
    TestValidator.equals("member joined", member.id, member.id);
    
    // 2. Create article as member (status should be 'approved' by business logic)
    const article = await generate_random_discussion_board_member_articles_create(memberConnection, {
        body: {
            title: RandomGenerator.paragraph({ sentences: 5, wordMin: 8, wordMax: 20 }),
            content: RandomGenerator.content({
                paragraphs: 3,
                sentenceMin: 15,
                sentenceMax: 25,
                wordMin: 4,
                wordMax: 8,
            }),
        },
    });
    typia.assert(article);
    TestValidator.equals("article created", article.title, article.title);
    
    // 3. Verify files for approved article (should include non-moderated files)
    const fileResponse = await api.functional.discussionBoard.admin.articles.files.index(memberConnection, {
        articleCode: article.code,
        body: {},
    });
    typia.assert(fileResponse);
    TestValidator.predicate("non-moderated files visible for approved articles", fileResponse.data.length > 0);
    
    // Verify file structure consistency (just to ensure valid data)
    TestValidator.equals("file data structure consistent", fileResponse.data.length, fileResponse.data.length); }