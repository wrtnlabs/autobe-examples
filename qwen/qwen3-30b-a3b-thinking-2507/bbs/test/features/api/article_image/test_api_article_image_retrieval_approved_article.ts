import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_article_image_retrieval_approved_article(connection: api.IConnection): Promise<void> {
    // Create a new member account
    const memberConnection: api.IConnection = { host: connection.host };
    const member = await authorize_member_join(memberConnection, {
        body: {
            href: 'https://example.com',
            referrer: 'https://referrer.com',
            ip: null
        }
    });
    typia.assert(member);
    // Create a new article that automatically has an approved status
    const article = await generate_random_discussion_board_member_articles_create(memberConnection, {
        body: {
            title: RandomGenerator.paragraph({
                sentences: 3,
                wordMin: 5,
                wordMax: 10
            }),
            content: RandomGenerator.content({
                paragraphs: 2,
                sentenceMin: 10,
                sentenceMax: 20,
                wordMin: 3,
                wordMax: 7
            })
        }
    });
    typia.assert(article);
    // Verify article status is approved
    TestValidator.equals('article status should be approved', article.status, 'approved');
    // Retrieve the image for the approved article (using standard ID pattern)
    const imageId = 'image-001';
    const image = await api.functional.discussionBoard.member.articles.images.getByArticleidAndImageid(memberConnection, {
        articleId: article.id,
        imageId: imageId
    });
    typia.assert(image);
    // Validate retrieved image properties
    TestValidator.equals('image belongs to article', image.article.id, article.id);
    TestValidator.equals('file name is not empty', image.file_name.length > 0, true);
    TestValidator.equals('image URL is valid', image.url.startsWith('http'), true);
}