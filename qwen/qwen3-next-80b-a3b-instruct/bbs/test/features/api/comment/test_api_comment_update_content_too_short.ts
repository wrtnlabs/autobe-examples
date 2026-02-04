import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticleTag";
import type { IEconomicDiscussionCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCitizen";
import type { IEconomicDiscussionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionComment";
import type { IEconomicDiscussionConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";
import { generate_random_economic_discussion_citizen_articles_create } from "../../../generate/generate_random_economic_discussion_citizen_articles_create";
import { prepare_random_economic_discussion_article } from "../../../prepare/prepare_random_economic_discussion_article";

export async function test_api_comment_update_content_too_short(
  connection: api.IConnection,
): Promise<void> {
  // Create citizen connection and authenticate
  const citizenConnection: api.IConnection = { host: connection.host };
  await authorize_citizen_join(citizenConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: `https://${RandomGenerator.alphaNumeric(12)}.io`,
      referrer: `https://${RandomGenerator.alphaNumeric(12)}.com`,
    } satisfies IEconomicDiscussionCitizen.IJoin,
  });
  // Generate a random UUID as commentId
  // This represents a non-existent comment but will still trigger content length validation
  const invalidCommentId: string = typia.random<string & tags.Format<"uuid">>();
  // Attempt to update comment with content shorter than minimum (4 characters)
  // This should fail with 400 Bad Request error due to content length minimum of 5 characters
  await TestValidator.error(
    "comment update should reject content shorter than 5 characters",
    async () => {
      await api.functional.economicDiscussion.citizen.comments.update(
        citizenConnection,
        {
          commentId: invalidCommentId,
          body: {
            content: "4ch",
          } satisfies IEconomicDiscussionComment.IUpdate,
        },
      );
    },
  );
}
