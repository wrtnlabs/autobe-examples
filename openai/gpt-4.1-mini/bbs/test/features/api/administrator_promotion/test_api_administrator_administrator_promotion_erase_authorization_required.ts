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

export async function test_api_administrator_administrator_promotion_erase_authorization_required(
  connection: api.IConnection,
): Promise<void> {
  // 1. Attempt deletion with unauthorized connection
  const invalidConnection: api.IConnection = { host: connection.host };
  // Use a random UUID for non-existent or random promotionId
  const randomPromotionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >() satisfies string & tags.Format<"uuid"> as string & tags.Format<"uuid">;
  // Expect 401 Unauthorized or similar error when using unauthorized connection
  await TestValidator.httpError(
    "deletion without authorization should fail",
    401,
    async () => {
      await api.functional.discussionBoard.administrator.administratorPromotions.erase(
        invalidConnection,
        { promotionId: randomPromotionId },
      );
    },
  );
  // 2. Authorized admin join and use authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 3. Attempt deletion with authorized connection
  // We may use the same randomPromotionId or a new one
  // This test primarily verifies authorization, not existence
  await TestValidator.error(
    "deletion with authorization should handle non-existent promotionId gracefully",
    async () => {
      await api.functional.discussionBoard.administrator.administratorPromotions.erase(
        adminConnection,
        { promotionId: randomPromotionId },
      );
    },
  );
}
