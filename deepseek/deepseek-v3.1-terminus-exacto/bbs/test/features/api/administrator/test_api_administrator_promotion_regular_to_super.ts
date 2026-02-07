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
 * Test the scenario where a super administrator promotes a regular administrator to super administrator grade.
 * Verifies that the grade field changes from 'regular' to 'super', the grade_changed_at timestamp is updated,
 * and the administrator record now references super_admin authentication instead of regular admin authentication.
 */
export async function test_api_administrator_promotion_regular_to_super(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create a regular administrator account
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdmin = await authorize_admin_join(regularAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(regularAdmin);
  // Note: The actual promotion requires an existing administrator assignment record
  // Since we don't have an API to create administrator assignments, we'll need to
  // use an existing administrator ID or create one through the proper workflow
  // For this test, we'll assume the regular admin account creates an administrator assignment
  // and we'll promote that assignment. In a real scenario, there should be an endpoint
  // to create administrator assignments or the system should auto-create them.
  // 3. Promote the regular administrator to super administrator grade
  // Using the admin ID as the administrator assignment ID (assuming they're linked)
  const promotionResponse =
    await api.functional.discussionBoard.superAdmin.administrators.update(
      superAdminConnection,
      {
        administratorId: regularAdmin.id,
        body: {
          grade: "super" satisfies "super",
        } satisfies IDiscussionBoardAdministratorPromotionApproval.IUpdate,
      },
    );
  typia.assert(promotionResponse);
  // 4. Validate the promotion response
  TestValidator.equals(
    "grade should be super",
    promotionResponse.grade,
    "super",
  );
  TestValidator.predicate(
    "grade_changed_at should be updated",
    promotionResponse.grade_changed_at !== null,
  );
  TestValidator.equals(
    "admin should be null after promotion",
    promotionResponse.admin,
    null,
  );
  TestValidator.predicate(
    "super_admin should be populated",
    promotionResponse.super_admin !== null,
  );
  TestValidator.equals(
    "is_active should remain true",
    promotionResponse.is_active,
    true,
  );
  TestValidator.predicate(
    "promoted_at should be set",
    promotionResponse.promoted_at !== null,
  );
  TestValidator.equals(
    "id should match original admin",
    promotionResponse.id,
    regularAdmin.id,
  );
}
