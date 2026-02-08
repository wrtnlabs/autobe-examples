import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotion";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_promotion_access_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection without any authorization header to simulate unauthenticated user
  const baseConnection: api.IConnection = { host: connection.host };
  // Generate a dummy UUID for promotionId (any random id is sufficient since access should be denied before existence check)
  const promotionId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to access the administrator promotion by promotionId without authentication
  await TestValidator.httpError(
    "unauthenticated access should be denied",
    401,
    async () => {
      await api.functional.discussionBoard.administrator.administratorPromotions.at(
        baseConnection,
        {
          promotionId,
        },
      );
    },
  );
}
