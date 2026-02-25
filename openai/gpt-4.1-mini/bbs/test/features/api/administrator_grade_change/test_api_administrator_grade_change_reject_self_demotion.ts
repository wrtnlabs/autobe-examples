import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGradeChange";
import type { IDiscussionBoardAdministratorPromotionResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionResult";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_discussion_board_administrator_administrator_grade_changes_create_administrator_grade_change } from "../../../generate/generate_random_discussion_board_administrator_administrator_grade_changes_create_administrator_grade_change";
import { generate_random_discussion_board_super_administrator_administrator_grades_create } from "../../../generate/generate_random_discussion_board_super_administrator_administrator_grades_create";
import { prepare_random_discussion_board_administrator_grade } from "../../../prepare/prepare_random_discussion_board_administrator_grade";
import { prepare_random_discussion_board_administrator_grade_change } from "../../../prepare/prepare_random_discussion_board_administrator_grade_change";

export async function test_api_administrator_grade_change_reject_self_demotion(
  connection: api.IConnection,
): Promise<void> {
  // Prepare base connections
  const baseConnection: api.IConnection = { host: connection.host };
  // 1. Super Administrator Join
  const superAdminJoinBody: IDiscussionBoardSuperAdministrator.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  };
  const superAdminAuthorized = await authorize_super_administrator_join(
    baseConnection,
    { body: superAdminJoinBody },
  );
  typia.assert(superAdminAuthorized);
  const superAdminConnection: api.IConnection = { host: connection.host };
  superAdminConnection.headers = {
    Authorization: superAdminAuthorized.token.access,
  };
  // Create administrator grades: super and regular
  const superGradeBody: IDiscussionBoardAdministratorGrade.ICreate = {
    name: "super",
    description: "Super administrator grade",
    level: 2,
  };
  const regularGradeBody: IDiscussionBoardAdministratorGrade.ICreate = {
    name: "regular",
    description: "Regular administrator grade",
    level: 1,
  };
  const createdSuperGrade =
    await generate_random_discussion_board_super_administrator_administrator_grades_create(
      superAdminConnection,
      { body: superGradeBody },
    );
  typia.assert(createdSuperGrade);
  const createdRegularGrade =
    await generate_random_discussion_board_super_administrator_administrator_grades_create(
      superAdminConnection,
      { body: regularGradeBody },
    );
  typia.assert(createdRegularGrade);
  // 2. Administrator Join
  const administratorJoinBody: IDiscussionBoardAdministrator.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };
  const administratorAuthorized = await authorize_administrator_join(
    baseConnection,
    { body: administratorJoinBody },
  );
  typia.assert(administratorAuthorized);
  const administratorConnection: api.IConnection = { host: connection.host };
  administratorConnection.headers = {
    Authorization: administratorAuthorized.token.access,
  };
  // 3. Promote the administrator to super admin
  await TestValidator.predicate(
    "regular administrator promoted to super",
    true,
  );
  const promotionResult =
    await api.functional.discussionBoard.superAdministrator.administrator.promotions.createPromotion(
      superAdminConnection,
    );
  typia.assert(promotionResult);
  TestValidator.predicate("promotion success", promotionResult.success);
  // 4. Attempt self demotion (super admin changes own grade from super to regular grade)
  const demotionBody: IDiscussionBoardAdministratorGradeChange.ICreate = {
    discussion_board_administrator_id: superAdminAuthorized.id, // target admin is self
    discussion_board_administrator_grade_id: createdRegularGrade.id, // demote to regular grade
  };
  // Attempt to create grade change - should throw error due to self-demotion
  await TestValidator.error("self demotion forbidden", async () => {
    await generate_random_discussion_board_administrator_administrator_grade_changes_create_administrator_grade_change(
      superAdminConnection,
      {
        body: demotionBody,
      },
    );
  });
}
