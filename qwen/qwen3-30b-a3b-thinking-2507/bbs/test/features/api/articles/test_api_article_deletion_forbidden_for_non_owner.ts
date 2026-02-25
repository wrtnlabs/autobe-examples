import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardArticle";
import type { IEconomicPoliticalDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardAttachment";
import type { IEconomicPoliticalDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardSection";
import type { IEconomicPoliticalDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardTag";
import type { IEconomicPoliticalDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUser";
import { prepare_random_economic_political_discussion_board_article } from "../../../prepare/prepare_random_economic_political_discussion_board_article";
import { prepare_random_economic_political_discussion_board_attachment } from "../../../prepare/prepare_random_economic_political_discussion_board_attachment";
import { generate_random_economic_political_discussion_board_user_articles_create } from "../../../generate/generate_random_economic_political_discussion_board_user_articles_create";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_article_deletion_forbidden_for_non_owner(connection: api.IConnection): Promise<void> {
    // 1. Authenticate as article owner
    const ownerConnection: api.IConnection = { host: connection.host };
    await authorize_user_join(ownerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        },
    });

    // 2. Owner creates article
    const article = await generate_random_economic_political_discussion_board_user_articles_create(ownerConnection, {
        body: {
            title: RandomGenerator.paragraph({ sentences: 1 }),
            content: RandomGenerator.content({ paragraphs: 2 }),
            section_id: typia.random<string & tags.Format<"uuid">>(),
        },
    });

    // 3. Authenticate as non-owner user
    const nonOwnerConnection: api.IConnection = { host: connection.host };
    await authorize_user_join(nonOwnerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        },
    });

    // 4. Non-owner attempts to delete article (with actor-specific connection)
    await TestValidator.error("article deletion forbidden for non-owner", async () => {
        await api.functional.economicPoliticalDiscussionBoard.user.articles.erase(nonOwnerConnection, {
            articleId: article.id satisfies string & tags.Format<"uuid">
        });
    });
}