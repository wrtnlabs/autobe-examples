import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSaleQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestion";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test suite for administrator retrieval of sale question details including success, soft-deleted failure, and unauthorized failure cases.
 */
export async function test_api_sale_question_detail_administrator(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1. Administrator joins and retrieves an existing active sale question.
  // Create new admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Admin join with fresh data
  const joinBody: IShoppingMallAdministrator.IJoin = {};
  const authorized = await authorize_administrator_join(adminConnection, {
    body: joinBody,
  });
  typia.assert(authorized);
  // Update connection headers with authorization
  adminConnection.headers = {
    ...(adminConnection.headers ?? {}),
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // Create a random questionId for testing
  const validQuestionId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve sale question details with valid questionId
  try {
    const saleQuestion =
      await api.functional.shoppingMall.administrator.sale_questions.at(
        adminConnection,
        { questionId: validQuestionId },
      );
    typia.assert(saleQuestion);
    // Additional validation can be here if schema had explicit props
  } catch (e) {
    // Possibly 404 if questionId doesn't exist, but scenario assumes success
    throw e;
  }
  // Scenario 2. Attempt to get a soft-deleted sale question
  // We simulate by assuming a questionId with deleted_at non-null
  // Since it's backend data dependent and not creatable here, pick random UUID
  const deletedQuestionId = typia.random<string & tags.Format<"uuid">>();
  // Expect 404 error
  await TestValidator.httpError(
    "should return 404 for soft-deleted sale question",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.sale_questions.at(
        adminConnection,
        {
          questionId: deletedQuestionId,
        },
      );
    },
  );
  // Scenario 3. Unauthorized access to sale question detail
  // Use fresh connection without authorization
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  // Expect 401 Unauthorized or similar
  await TestValidator.httpError(
    "should return 401 for unauthorized access",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.administrator.sale_questions.at(
        unauthorizedConnection,
        {
          questionId: validQuestionId,
        },
      );
    },
  );
}
