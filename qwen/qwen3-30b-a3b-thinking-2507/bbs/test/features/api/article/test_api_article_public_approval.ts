import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_article_public_approval(connection: api.IConnection): Promise<void> {
    // 1. Create verified member account
    const memberConnection: api.IConnection = { host: connection.host };
    const member: IDiscussionBoardMember.IAuthorized = await authorize_member_join(memberConnection, {
        body: {
            href: `https://example.com/${RandomGenerator.alphaNumeric(8)}`,
            referrer: `https://referrer.com/${RandomGenerator.alphaNumeric(8)}`
        },
    });
    typia.assert(member);
    
    // 2. Create article as verified member
    const article: IDiscussionBoardArticle = await generate_random_discussion_board_member_articles_create(memberConnection, {});
    typia.assert(article);
    
    // 3. Verify article status is 'approved' (verified members get immediate approval)
    TestValidator.equals("article status", article.status, "approved");
    
    // 4. Retrieve article publicly using URL-safe code
    const publicArticle: IDiscussionBoardArticle = await api.functional.discussionBoard.articles.at(connection, {
        articleCode: article.code
    });
    typia.assert(publicArticle);
    
    // 5. Validate the retrieved article matches the original
    TestValidator.equals("article id match", publicArticle.id, article.id);
    TestValidator.equals("article title match", publicArticle.title, article.title);
    TestValidator.equals("article content match", publicArticle.content, article.content);
    TestValidator.equals("article author id match", publicArticle.author.id, article.author.id);
    
    // 6. Verify required fields exist and are populated (simplified to specific required fields)
    TestValidator.predicate("article code exists", !!publicArticle.code);
    TestValidator.predicate("article title exists", !!publicArticle.title);
    TestValidator.predicate("article content exists", !!publicArticle.content);
    TestValidator.predicate("article status exists", !!publicArticle.status);
    TestValidator.predicate("article author exists", !!publicArticle.author);
    
    // 7. Validate minimum content length requirements (title and content must be ≥50 characters)
    TestValidator.predicate("title length at least 50 characters", article.title.length >= 50);
    TestValidator.predicate("content length at least 50 characters", article.content.length >= 50);
}