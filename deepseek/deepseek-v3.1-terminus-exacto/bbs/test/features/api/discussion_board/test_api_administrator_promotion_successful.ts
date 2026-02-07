import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionApproval";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test the successful promotion of a regular administrator to super administrator status.
 * Validates that a super administrator can promote a regular administrator, updating their
 * grade level from 'regular' to 'super', creating an audit trail record, and returning
 * the updated administrator information with the correct grade and authentication references.
 */
export async function test_api_administrator_promotion_successful(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IDiscussionBoardSuperAdmin.ILogin,
  });
  // Create regular administrator connection and authenticate
  const regularAdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(regularAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // Promote the regular administrator to super administrator
  const promotionResult =
    await api.functional.discussionBoard.superAdmin.promote(
      superAdminConnection,
      {
        administratorId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(promotionResult);
  // Validate promotion results
  TestValidator.equals(
    "grade should be 'super'",
    promotionResult.grade,
    "super",
  );
  TestValidator.predicate(
    "grade_changed_at should be set",
    promotionResult.grade_changed_at !== null,
  );
  TestValidator.equals(
    "admin field should be null",
    promotionResult.admin,
    null,
  );
  TestValidator.predicate(
    "super_admin field should be populated",
    promotionResult.super_admin !== null,
  );
  TestValidator.equals(
    "is_active should be true",
    promotionResult.is_active,
    true,
  );
}
