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

export async function test_api_administrator_administrator_promotion_erase_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Test deleting a non-existent administrator promotion record by an invalid UUID
  // 1. Authorize an administrator account for the test
  const adminConnection: api.IConnection = { host: connection.host };
  // Use authorize_administrator_join utility to register and get authorized token
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  // Set Authorization header with acquired access token
  adminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Use a random UUID that is very unlikely to exist in records
  const fakePromotionId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to erase the non-existent administrator promotion record
  // Expect an HttpError due to not found record
  await TestValidator.httpError(
    "erase non-existent administrator promotion record should fail",
    404,
    async () => {
      await api.functional.discussionBoard.administrator.administratorPromotions.erase(
        adminConnection,
        { promotionId: fakePromotionId },
      );
    },
  );
}
