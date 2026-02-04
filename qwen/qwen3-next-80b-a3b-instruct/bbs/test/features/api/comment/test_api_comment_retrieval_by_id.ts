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

export async function test_api_comment_retrieval_by_id(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as citizen
  const citizenConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_citizen_join(citizenConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicDiscussionCitizen.IJoin,
  });
  typia.assert(authResult);
  // Step 2: Generate a random valid UUID for comment ID
  // Note: We have no way to create a comment with the provided API functions
  // so we generate a valid UUID that follows the format
  const commentId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Retrieve the comment by its ID using the authenticated citizen connection
  const retrievedComment =
    await api.functional.economicDiscussion.citizen.comments.getById(
      citizenConnection,
      {
        id: commentId,
      },
    );
  typia.assert(retrievedComment);
  // Step 4: Validate the retrieved comment structure matches the IEconomicDiscussionComment type
  // Based on IEconomicDiscussionComment type definition:
  // - content: string | null | undefined (optional)
  // - postedTime: string (required, ISO 8601 format)
  // - economic_discussion_citizen_id: string (required)
  // Validate postedTime exists and is a non-empty string
  TestValidator.predicate(
    "comment postedTime is a non-empty string",
    typeof retrievedComment.postedTime === "string" &&
      retrievedComment.postedTime.length > 0,
  );
  // Validate economic_discussion_citizen_id exists and is a non-empty string
  TestValidator.predicate(
    "comment author id is a non-empty string",
    typeof retrievedComment.economic_discussion_citizen_id === "string" &&
      retrievedComment.economic_discussion_citizen_id.length > 0,
  );
  // Validate content is either a string, null, or undefined as per type definition
  TestValidator.predicate(
    "comment content is valid type",
    retrievedComment.content === null ||
      retrievedComment.content === undefined ||
      typeof retrievedComment.content === "string",
  );
}
