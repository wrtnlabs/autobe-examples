import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorAssignment";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorAssignment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_administrator_assignments_by_super_admins_filter_promotions(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Filter assignments specifically for promotion records
  const response =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.by_super_admins.index(
      superAdminConnection,
      {
        body: {
          assignment_type: "promotion",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdministratorAssignment.IRequest,
      },
    );
  typia.assert(response);
  // Validate all assignment records have promotion type and valid promotion paths
  if (response.data.length > 0) {
    for (const assignment of response.data) {
      TestValidator.equals(
        "assignment type is promotion",
        assignment.assignment_type,
        "promotion",
      );
      // Validate role transitions represent valid promotions
      const validPromotions = [
        { old: "member", new: "admin" },
        { old: "member", new: "super_admin" },
        { old: "admin", new: "super_admin" },
      ];
      const isValidPromotion = validPromotions.some(
        (promo) =>
          assignment.old_role === promo.old &&
          assignment.new_role === promo.new,
      );
      TestValidator.predicate("valid promotion path", isValidPromotion);
    }
  }
}
