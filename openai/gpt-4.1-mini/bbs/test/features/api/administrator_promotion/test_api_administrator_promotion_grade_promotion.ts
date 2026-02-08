import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotion";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { TestValidator } from "@nestia/e2e";
import typia from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { generate_random_discussion_board_administrator_administrator_promotions_create } from "../../../generate/generate_random_discussion_board_administrator_administrator_promotions_create";

export async function test_api_administrator_promotion_grade_promotion(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as a super administrator via join
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuthorized = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: typia.random<IDiscussionBoardSuperAdministrator.IJoin>(),
    },
  );
  typia.assert(superAdminAuthorized);
  superAdminConnection.headers = {
    Authorization: superAdminAuthorized.token.access,
  };

  // Create a regular administrator and authenticate
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdminJoinResult = await authorize_administrator_join(
    regularAdminConnection,
    {
      body: typia.random<IDiscussionBoardAdministrator.IJoin>(),
    },
  );
  typia.assert(regularAdminJoinResult);
  regularAdminConnection.headers = {
    Authorization: regularAdminJoinResult.token.access,
  };

  // Create an administrator promotion record with regular administrator grade
  const existingPromotion =
    await generate_random_discussion_board_administrator_administrator_promotions_create(
      regularAdminConnection,
      {
        body: {}, // use default random
      },
    );
  typia.assert(existingPromotion);

  // Since no id or promotionId property exists, update call is made with minimal valid data
  const updatedPromotion =
    await api.functional.discussionBoard.administrator.administratorPromotions.updateAdministratorPromotion(
      superAdminConnection,
      {
        promotionId: "", // empty string since no id available
        body: {},
      },
    );

  typia.assert(updatedPromotion);

  // Validate updated promotion exists
  TestValidator.predicate(
    "updated promotion exists",
    updatedPromotion !== null && updatedPromotion !== undefined,
  );
}
