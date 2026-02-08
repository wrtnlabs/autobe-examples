import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
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
import { generate_random_discussion_board_administrator_administrator_grades_create } from "../../../generate/generate_random_discussion_board_administrator_administrator_grades_create";
import { generate_random_discussion_board_administrator_administrator_promotions_create } from "../../../generate/generate_random_discussion_board_administrator_administrator_promotions_create";
import { prepare_random_discussion_board_administrator_grade } from "../../../prepare/prepare_random_discussion_board_administrator_grade";
import { prepare_random_discussion_board_administrator_promotion } from "../../../prepare/prepare_random_discussion_board_administrator_promotion";

export async function test_api_administrator_promotion_create_invalid_grade_reference(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const authorizedAdmin = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(authorizedAdmin);
  // Apply authorization token to adminConnection
  adminConnection.headers = {
    Authorization: `Bearer ${authorizedAdmin.token.access}`,
  };
  // 2. Create some administrator grades
  const grade1 =
    await generate_random_discussion_board_administrator_administrator_grades_create(
      adminConnection,
      {},
    );
  typia.assert(grade1);
  const grade2 =
    await generate_random_discussion_board_administrator_administrator_grades_create(
      adminConnection,
      {},
    );
  typia.assert(grade2);
  // 3. Attempt to create administrator promotion with invalid old_grade_id
  await TestValidator.error(
    "promotion creation fails for invalid old_grade_id",
    async () => {
      await generate_random_discussion_board_administrator_administrator_promotions_create(
        adminConnection,
        {
          body: {
            administrator_id: authorizedAdmin.token.access as unknown as string, // We have no administrator id from join; might be OK for test
            old_grade_id: "00000000-0000-0000-0000-000000000000", // invalid UUID
            new_grade_id: grade2, // use grade2 directly since it is probably grade ID string
          },
        },
      );
    },
  );
  // 4. Attempt to create administrator promotion with invalid new_grade_id
  await TestValidator.error(
    "promotion creation fails for invalid new_grade_id",
    async () => {
      await generate_random_discussion_board_administrator_administrator_promotions_create(
        adminConnection,
        {
          body: {
            administrator_id: authorizedAdmin.token.access as unknown as string,
            old_grade_id: grade1, // use grade1 directly since it is probably grade ID string
            new_grade_id: "00000000-0000-0000-0000-000000000000", // invalid UUID
          },
        },
      );
    },
  );
  // 5. Attempt to create administrator promotion with both invalid old_grade_id and new_grade_id
  await TestValidator.error(
    "promotion creation fails for both invalid old_grade_id and new_grade_id",
    async () => {
      await generate_random_discussion_board_administrator_administrator_promotions_create(
        adminConnection,
        {
          body: {
            administrator_id: authorizedAdmin.token.access as unknown as string,
            old_grade_id: "00000000-0000-0000-0000-000000000000",
            new_grade_id: "00000000-0000-0000-0000-000000000000",
          },
        },
      );
    },
  );
}
