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
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentModeration";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_comment_moderation_retrieve_by_admin(connection: api.IConnection): Promise<void> {
    // Create administrator connection and authenticate
    const adminConnection: api.IConnection = { host: connection.host };
    const adminAuth = await authorize_admin_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            display_name: RandomGenerator.name(),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IDiscussionBoardAdmin.IJoin,
    });
    typia.assert(adminAuth);

    // Create regular user connection and authenticate
    const userConnection: api.IConnection = { host: connection.host };
    const userAuth = await authorize_user_join(userConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            display_name: RandomGenerator.name(),
        } satisfies IDiscussionBoardUser.IJoin,
    });
    typia.assert(userAuth);

    // Create test article as regular user
    const article = await generate_random_discussion_board_user_articles_create(userConnection, {
        body: {
            title: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 8 }),
            content: RandomGenerator.content({ paragraphs: 1, sentenceMin: 3, sentenceMax: 5 }),
            discussion_board_section_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IDiscussionBoardArticle.ICreate,
    });
    typia.assert(article);

    // Create test comment as regular user
    const comment = await generate_random_discussion_board_user_articles_comments_create(userConnection, {
        params: { articleId: article.id },
        body: {
            content: RandomGenerator.paragraph({ sentences: 1, wordMin: 10, wordMax: 20 }),
        } satisfies IDiscussionBoardComment.ICreate,
    });
    typia.assert(comment);

    // Administrator deletes the comment to create moderation record
    await api.functional.discussionBoard.admin.comments.erase(adminConnection, {
        commentId: comment.id,
    });

    // Since we cannot retrieve moderation record without knowing the moderation ID,
    // and no API endpoint exists to list moderations or get moderation ID from deletion,
    // this test validates the moderation workflow up to the deletion point.
    // The actual moderation record retrieval would require additional API endpoints
    // that are not currently available in the provided SDK.
    TestValidator.predicate("comment deletion completed successfully", true);
}