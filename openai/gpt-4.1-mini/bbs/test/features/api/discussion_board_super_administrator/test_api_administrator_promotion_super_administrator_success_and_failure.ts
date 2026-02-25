import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardAdministratorPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotion";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_discussion_board_super_administrator_administrator_promotions_promote_administrator } from "../../../generate/generate_random_discussion_board_super_administrator_administrator_promotions_promote_administrator";
import { prepare_random_discussion_board_administrator_promotion } from "../../../prepare/prepare_random_discussion_board_administrator_promotion";

export async function test_api_administrator_promotion_super_administrator_success_and_failure(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  typia.assert(superAdminAuth);
  superAdminConnection.headers ??= {};
  superAdminConnection.headers.Authorization = superAdminAuth.token.access;
  // 2. Prepare a valid promotion payload by reusing generation utility
  const validPromotion =
    await generate_random_discussion_board_super_administrator_administrator_promotions_promote_administrator(
      superAdminConnection,
      {},
    );
  typia.assert(validPromotion);
  // Validate promotion record data
  TestValidator.equals(
    "promotion administrator id matches",
    validPromotion.administrator.id,
    validPromotion.administrator.id,
  );
  TestValidator.notEquals(
    "old grade and new grade differ",
    validPromotion.oldGrade,
    validPromotion.newGrade,
  );
  TestValidator.predicate(
    "promotion has createdAt",
    validPromotion.createdAt.length > 0,
  );
  TestValidator.predicate(
    "promotion has updatedAt",
    validPromotion.updatedAt.length > 0,
  );
  // 3. Attempt promotion with invalid administrator id
  await TestValidator.httpError(
    "fail promotion - non-existent administrator",
    [404, 403],
    async () => {
      const invalidPromotionBody: IDiscussionBoardAdministratorPromotion.ICreate =
        {
          discussion_board_administrator_id:
            "00000000-0000-0000-0000-000000000000",
          old_grade_id: "00000000-0000-0000-0000-000000000000",
          new_grade_id: "00000000-0000-0000-0000-000000000000",
        };
      // Use utility function to send invalid promotion
      await generate_random_discussion_board_super_administrator_administrator_promotions_promote_administrator(
        superAdminConnection,
        { body: invalidPromotionBody },
      );
    },
  );
}
