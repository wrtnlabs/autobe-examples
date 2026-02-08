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

export async function test_api_administrator_promotion_create_success(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as a super administrator first
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuthorized = await authorize_administrator_join(
    superAdminConnection,
    { body: {} },
  );
  typia.assert(superAdminAuthorized);
  // Use the authorized connection with updated headers for subsequent calls
  // Create two administrator grades (old grade and new grade) as super administrator
  const oldGrade =
    await generate_random_discussion_board_administrator_administrator_grades_create(
      superAdminConnection,
      {},
    );
  typia.assert(oldGrade);
  const newGrade =
    await generate_random_discussion_board_administrator_administrator_grades_create(
      superAdminConnection,
      {},
    );
  typia.assert(newGrade);
  // Create a UUID for administrator_id because we do not have administrator id from join
  const administratorId = typia.random<string & tags.Format<"uuid">>();
  // Create a promotion record using a promotion creation utility passing valid references
  const promotion =
    await generate_random_discussion_board_administrator_administrator_promotions_create(
      superAdminConnection,
      {
        body: {
          administrator_id: administratorId,
          old_grade_id: (oldGrade as any).id ?? "00000000-0000-0000-0000-000000000000",
          new_grade_id: (newGrade as any).id ?? "00000000-0000-0000-0000-000000000000",
        },
      },
    );
  typia.assert(promotion);
}
