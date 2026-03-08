import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_demotion_success(
  connection: api.IConnection,
): Promise<void> {
  // Create acting admin (will perform the demotion)
  const actingAdminConnection: api.IConnection = { host: connection.host };
  const actingAdmin = await authorize_admin_join(actingAdminConnection, {});
  typia.assert(actingAdmin);
  // Create target admin (will be demoted)
  const targetAdminConnection: api.IConnection = { host: connection.host };
  const targetAdmin = await authorize_admin_join(targetAdminConnection, {});
  typia.assert(targetAdmin);
  // Promote acting admin to super grade
  const promotedActingAdmin =
    await api.functional.discussionBoard.admin.admins.promote(
      actingAdminConnection,
      {
        adminId: actingAdmin.id,
        body: {
          reason: "Initial super admin setup for testing",
        } satisfies IDiscussionBoardAdmin.IPromote,
      },
    );
  typia.assert(promotedActingAdmin);
  // Promote target admin to super grade
  const promotedTargetAdmin =
    await api.functional.discussionBoard.admin.admins.promote(
      actingAdminConnection,
      {
        adminId: targetAdmin.id,
        body: {
          reason: "Promotion for demotion test",
        } satisfies IDiscussionBoardAdmin.IPromote,
      },
    );
  typia.assert(promotedTargetAdmin);
  // Verify both are super admins before demotion
  TestValidator.equals(
    "acting admin is super",
    promotedActingAdmin.grade,
    "super",
  );
  TestValidator.equals(
    "target admin is super",
    promotedTargetAdmin.grade,
    "super",
  );
  // Store original profile data for verification
  const originalEmail = promotedTargetAdmin.email;
  const originalDisplayName = promotedTargetAdmin.displayName;
  const originalBio = promotedTargetAdmin.bio;
  // Execute demotion
  const demotedAdmin = await api.functional.discussionBoard.admin.admins.demote(
    actingAdminConnection,
    {
      adminId: targetAdmin.id,
    },
  );
  typia.assert(demotedAdmin);
  // Verify demotion results
  TestValidator.equals(
    "grade changed to regular",
    demotedAdmin.grade,
    "regular",
  );
  TestValidator.equals("id remains unchanged", demotedAdmin.id, targetAdmin.id);
  TestValidator.equals(
    "email remains unchanged",
    demotedAdmin.email,
    originalEmail,
  );
  TestValidator.equals(
    "displayName remains unchanged",
    demotedAdmin.displayName,
    originalDisplayName,
  );
  TestValidator.equals("bio remains unchanged", demotedAdmin.bio, originalBio);
}
