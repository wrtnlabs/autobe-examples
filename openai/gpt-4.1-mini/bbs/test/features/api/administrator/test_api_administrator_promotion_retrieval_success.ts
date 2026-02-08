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

export async function test_api_administrator_promotion_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieval of an existing administrator promotion record by its unique identifier.
  // Steps:
  // 1. Create a new administrator account to obtain authentication token.
  // 2. Use the authenticated admin connection to attempt to retrieve an administrator promotion record by a valid promotionId.
  // 3. Assert the response is complete and valid, matching the IDiscussionBoardAdministratorPromotion DTO.
  // 1. Administrator registration and login to get token
  const adminJoinOutput = await authorize_administrator_join(
    { host: connection.host },
    { body: typia.random<IDiscussionBoardAdministrator.IJoin>() },
  );
  typia.assert(adminJoinOutput);
  // Create a new admin connection with authentication headers
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${adminJoinOutput.token.access}` },
  };
  // Since the promotion record must exist, attempt to retrieve by a random UUID
  // Note: Ideally, we would create a promotion record, but no create API is given
  // Use typia.random UUID as a placeholder, may require existing data in DB
  const promotionId = typia.random<string & tags.Format<"uuid">>();
  // 2. Retrieve the administrator promotion record
  const promotion =
    await api.functional.discussionBoard.administrator.administratorPromotions.at(
      adminConnection,
      {
        promotionId,
      },
    );
  // 3. Validate the response structure
  typia.assert(promotion);
  // Business logic validation skipped as id property does not exist
}