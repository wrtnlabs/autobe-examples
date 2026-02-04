import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

export async function test_api_comment_retrieval_all(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as citizen
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizenData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEconomicDiscussionCitizen.IJoin;
  const registeredCitizen = await authorize_citizen_join(citizenConnection, {
    body: citizenData,
  });
  typia.assert(registeredCitizen);
  // Step 3: Retrieve comments with empty tags array (no article creation)
  // Since we cannot create articles or comments through the provided API,
  // we directly test the retrieval of all comments without filtering
  const allComments =
    await api.functional.economicDiscussion.citizen.comments.index(
      citizenConnection,
      {
        body: {
          tags: [],
        } satisfies IEconomicDiscussionComment.IRequest,
      },
    );
  typia.assert(allComments);
  // Step 4: Validate the retrieved comments
  // We validate the response structure matches IEconomicDiscussionComment
  // The API returns an array of comments with specific fields
  if (Array.isArray(allComments)) {
    allComments.forEach((comment: IEconomicDiscussionComment) => {
      // Validate postedTime exists - according to DTO, it's required
      TestValidator.equals("comment has postedTime", comment.postedTime !== undefined, true);
      // Validate economic_discussion_citizen_id exists - according to DTO, it's required
      TestValidator.equals(
        "comment has author id",
        comment.economic_discussion_citizen_id !== undefined,
        true,
      );
      // Validate content is present, even though it's optional in the DTO
      // According to scenario, we want comments with full content
      TestValidator.predicate(
        "comment has content",
        comment.content !== undefined && comment.content !== null,
      );
    });
  }
  // Confirm that the endpoint works with empty tags array (all comments)
  TestValidator.equals("response is array", Array.isArray(allComments), true);
}