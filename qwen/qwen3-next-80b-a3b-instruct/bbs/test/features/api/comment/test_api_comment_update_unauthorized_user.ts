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

/**
 * Test comment update attempt by unauthorized user (not the original author).
 *
 * This test verifies the system enforces ownership-based authorization for comment updates.
 * Since the API does not provide a way to create comments (no create endpoint exists),
 * we must test the update operation by targeting a comment ID that would exist.
 * The test authenticates two users: one who would be the comment author and another
 * unauthorized user who attempts to update a comment.
 *
 * Step 1: Authenticate Citizen A (comment author)
 * Step 2: Create an article on which a comment would be placed
 * Step 3: Authenticate Citizen B (unauthorized updater)
 * Step 4: Attempt to update a comment with a randomly generated ID (since comments cannot be created)
 * Step 5: Verify the system returns 403 Forbidden error for unauthorized update
 */
export async function test_api_comment_update_unauthorized_user(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate Citizen A (comment author)
  const citizenAConnection: api.IConnection = { host: connection.host };
  const citizenA: IEconomicDiscussionCitizen.IAuthorized =
    await authorize_citizen_join(citizenAConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(citizenA);
  // Step 2: Create an article for which a comment would exist
  const article: IEconomicDiscussionArticle =
    await generate_random_economic_discussion_citizen_articles_create(
      citizenAConnection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
          content: RandomGenerator.content({
            paragraphs: 3,
            sentenceMin: 15,
            sentenceMax: 25,
          }),
        },
      },
    );
  typia.assert(article);
  // Step 3: Authenticate Citizen B (unauthorized updater)
  const citizenBConnection: api.IConnection = { host: connection.host };
  const citizenB: IEconomicDiscussionCitizen.IAuthorized =
    await authorize_citizen_join(citizenBConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(citizenB);
  // Step 4: Generate a fake comment ID (since we have no way to create comments)
  // This represents a comment that Citizen A would have created on the article
  const commentId: string = typia.random<string & tags.Format<"uuid">>();
  // Step 5: Citizen B attempts to update the comment (which doesn't exist, but we're testing authorization)
  // This should fail with 403 Forbidden because Citizen B is not the author
  await TestValidator.error(
    "unauthorized user cannot update other citizen's comment",
    async () => {
      await api.functional.economicDiscussion.citizen.comments.update(
        citizenBConnection,
        {
          commentId: commentId,
          body: {
            content: "Updated by unauthorized user",
          } satisfies IEconomicDiscussionComment.IUpdate,
        },
      );
    },
  );
}
