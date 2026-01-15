import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { generate_random_discussion_board_citizen_articles_create } from "../../../generate/generate_random_discussion_board_citizen_articles_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_article_retrieval_by_citizen(connection: api.IConnection): Promise<void> {
    // Step 1: Create a new connection and authenticate as a member (citizen)
    const citizenConnection: api.IConnection = { host: connection.host };
    const citizenUser: IDiscussionBoardUser.IAuthorized = await authorize_member_join(citizenConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardUser.IJoin,
    });
    typia.assert(citizenUser);
    // Step 2: Create a new article (which will be in 'draft' status based on business rules)
    const createdArticle: IDiscussionBoardArticle = await generate_random_discussion_board_citizen_articles_create(citizenConnection, {
        body: {
            title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
            content: RandomGenerator.content({ paragraphs: 2, sentenceMin: 10, sentenceMax: 15, wordMin: 3, wordMax: 8 }),
        } satisfies IDiscussionBoardArticle.ICreate,
    });
    typia.assert(createdArticle);
    // Step 3: Retrieve the same article by its ID
    const retrievedArticle: IDiscussionBoardArticle = await api.functional.discussionBoard.posts.at(citizenConnection, {
        postId: createdArticle.id,
    });
    typia.assert(retrievedArticle);
    // Step 4: Validate the retrieved article has the same properties as the created article
    TestValidator.equals("article title matches", retrievedArticle.title, createdArticle.title);
    TestValidator.equals("article content matches", retrievedArticle.content, createdArticle.content);
    TestValidator.equals("article status matches", retrievedArticle.status, createdArticle.status);
    TestValidator.equals("article id matches", retrievedArticle.id, createdArticle.id);
    TestValidator.predicate("created_at is a valid date-time format", typia.assert<string & tags.Format<"date-time">>(retrievedArticle.created_at) !== undefined);
}