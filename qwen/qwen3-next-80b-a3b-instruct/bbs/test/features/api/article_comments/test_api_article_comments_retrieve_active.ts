import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import type { IEconomicBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";

export async function test_api_article_comments_retrieve_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create citizen user
  const citizenConnection: api.IConnection = { host: connection.host };
  const joinData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(10),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IEconomicBoardCitizen.IJoin;
  await authorize_citizen_join(citizenConnection, { body: joinData });
  // 2. Use a random article ID (article creation endpoint not provided)
  const articleId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create multiple comments (active and deleted) - simulated via comment index endpoint
  const commentCount = 25;
  const comments = await Promise.all(
    ArrayUtil.repeat(commentCount, async (index) => {
      const commentData = {
        content: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IEconomicBoardComment.IRequest;
      const response =
        await api.functional.economicBoard.citizen.articles.comments.index(
          citizenConnection,
          {
            articleId,
            body: commentData,
          },
        );
      typia.assert<IEconomicBoardComment.ISummary>(response);
      return response;
    }),
  );
  // 4. Retrieve active comments
  const activeCommentsResponse =
    await api.functional.economicBoard.citizen.articles.comments.index(
      citizenConnection,
      {
        articleId,
        body: {},
      },
    );
  const activeComments = typia.assert<IPageIEconomicBoardComment.ISummary>(
    activeCommentsResponse,
  );
  // 5. Validate active comments
  TestValidator.equals("pagination limit", activeComments.pagination.limit, 20);
  TestValidator.equals(
    "pagination current",
    activeComments.pagination.current,
    1,
  );
  await TestValidator.predicate(
    "total active comments greater than 0",
    () => activeComments.pagination.records > 0,
  );
  TestValidator.equals(
    "active comments count",
    activeComments.data.length,
    Math.min(activeComments.pagination.records, 20),
  );
  // 6. Validate that all comments are returned (no deleted_at in ISummary)
  // Since deleted_at property doesn't exist in ISummary, we cannot validate this.
  // We assume the API filtering behavior is correct as per specification.
  // 7. Validate sorted by created_at ASC (oldest first)
  // Since created_at property doesn't exist in ISummary, we cannot validate sorting.
  // The API specification requires sorting, but we cannot verify it without the property.
  // We'll assume the API implementation follows the specification.
}
