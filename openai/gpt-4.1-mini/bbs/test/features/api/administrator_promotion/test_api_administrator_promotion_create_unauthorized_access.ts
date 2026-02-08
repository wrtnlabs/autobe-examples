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
import { generate_random_discussion_board_administrator_administrator_promotions_create } from "../../../generate/generate_random_discussion_board_administrator_administrator_promotions_create";
import { prepare_random_discussion_board_administrator_promotion } from "../../../prepare/prepare_random_discussion_board_administrator_promotion";

export async function test_api_administrator_promotion_create_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Test authorization enforcement by attempting to create an administrator promotion record as a regular administrator (without super administrator privileges).
  // Perform an administrator join to obtain a regular administrator context, then try to create a promotion record.
  // Expect the service to reject the request due to insufficient authorization rights.
  // This validates that only super administrators can access this audit-focused API for administrator grade changes.
  // 1. Administrator join to obtain regular administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {}, // IDiscussionBoardAdministrator.IJoin is empty type
  });
  typia.assert(authorized);
  adminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Attempt to create an administrator promotion record as a regular administrator
  // Prepare a body with empty object according to the empty IDiscussionBoardAdministratorPromotion.ICreate
  // Expect an authorization failure (likely throwing HttpError with 403 Forbidden or 401 Unauthorized)
  await TestValidator.error(
    "creating administrator promotion with insufficient privileges should fail",
    async () => {
      await api.functional.discussionBoard.administrator.administratorPromotions.create(
        adminConnection,
        {
          body: {},
        },
      );
    },
  );
}
