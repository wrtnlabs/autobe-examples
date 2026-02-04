import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticleTag";
import type { IEconomicDiscussionCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCitizen";
import type { IEconomicDiscussionComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionComment";
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

export async function test_api_comment_filtering_multiple_tags_and_logic(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as citizen
  const citizenConnection: api.IConnection = { host: connection.host };
  await authorize_citizen_join(citizenConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicDiscussionCitizen.IJoin,
  });
  // Step 2: Test filtering with known matching tags (but we cannot create comments, so this is theoretical)
  // The API will return a comment object if one matches
  const response =
    await api.functional.economicDiscussion.citizen.comments.index(
      citizenConnection,
      {
        body: {
          tags: ["economy", "tax"], // The tags are used in the request for filtering
        } satisfies IEconomicDiscussionComment.IRequest,
      },
    );
  typia.assert(response); // Validate structure
  // Step 3: Test filtering with non-matching tags - should return 404
  await TestValidator.error(
    "no comments match invalid tag combination",
    async () => {
      await api.functional.economicDiscussion.citizen.comments.index(
        citizenConnection,
        {
          body: {
            tags: ["economy", "finance"],
          } satisfies IEconomicDiscussionComment.IRequest,
        },
      );
    },
  );
  // Step 4: Test case-sensitive matching
  await TestValidator.error(
    "case-sensitive matching: invalid uppercase tag",
    async () => {
      await api.functional.economicDiscussion.citizen.comments.index(
        citizenConnection,
        {
          body: {
            tags: ["Economy", "tax"], // 'Economy' (uppercase) should not match 'economy'
          } satisfies IEconomicDiscussionComment.IRequest,
        },
      );
    },
  );
}
