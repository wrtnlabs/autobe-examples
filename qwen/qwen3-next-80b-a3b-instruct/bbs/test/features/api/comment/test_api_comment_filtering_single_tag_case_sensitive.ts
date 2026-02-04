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

export async function test_api_comment_filtering_single_tag_case_sensitive(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as citizen using authorization function
  const citizenConnection: api.IConnection = { host: connection.host };
  await authorize_citizen_join(citizenConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.org/referral",
    } satisfies IEconomicDiscussionCitizen.IJoin,
  });
  // Step 2: Create an article with a tag 'economy' (comments are filtered by article tags, not comment tags)
  const article =
    await generate_random_economic_discussion_citizen_articles_create(
      citizenConnection,
      {
        body: {
          title: "Test Article on Economy",
          content: "This article discusses economic trends.",
          tags: ["economy"],
        } satisfies IEconomicDiscussionArticle.ICreate,
      },
    );
  typia.assert(article);
  // Step 3: Filter comments by the tag 'economy' (matches article tags)
  const commentResponse =
    await api.functional.economicDiscussion.citizen.comments.index(
      citizenConnection,
      {
        body: {
          tags: ["economy"],
        } satisfies IEconomicDiscussionComment.IRequest,
      },
    );
  // Cast to array explicitly and Assert it as array of comments
  const comments: IEconomicDiscussionComment[] =
    typia.assert<Array<IEconomicDiscussionComment>>(commentResponse);
  // Step 4: Verify that comments are returned for the 'economy' tag
  TestValidator.predicate(
    "at least one comment found for 'economy' tag",
    comments.length > 0,
  );
  // Step 5: Validate case-sensitive matching by filtering with 'Economy'
  const mixedCaseTagResponse =
    await api.functional.economicDiscussion.citizen.comments.index(
      citizenConnection,
      {
        body: {
          tags: ["Economy"],
        } satisfies IEconomicDiscussionComment.IRequest,
      },
    );
  const mixedCaseComments: IEconomicDiscussionComment[] =
    typia.assert<Array<IEconomicDiscussionComment>>(mixedCaseTagResponse);
  TestValidator.equals(
    "case-sensitive tag 'Economy' returns no matching comments",
    mixedCaseComments.length,
    0,
  );
  // Step 6: Validate no truncation occurs - ensure content is present and within limits
  for (const comment of comments) {
    void TestValidator.predicate(
      "comment content is not truncated",
      () =>
        comment.content != null &&
        comment.content.length > 0 &&
        comment.content.length <= 5000,
    );
  }
}
