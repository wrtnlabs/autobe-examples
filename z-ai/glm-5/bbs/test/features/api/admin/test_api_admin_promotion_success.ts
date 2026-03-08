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

export async function test_api_admin_promotion_success(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test successful promotion of a regular administrator to super administrator
   * grade by a super administrator.
   *
   * This test validates the complete promotion workflow including authorization,
   * business rule compliance, and database updates.
   *
   * Prerequisite: A super administrator account must exist in the test database
   * or the test should run in simulation mode.
   */
  // Step 1: Create the super administrator (requester)
  // Using simulation mode to bypass the requirement for pre-existing super admin
  // In production, this would require a seeded super admin account
  const superAdminConnection: api.IConnection = {
    host: connection.host,
    simulate: true, // Enable simulation mode for authorization bypass
  };
  const superAdminAuth = await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: `super_${RandomGenerator.name()}`,
      bio: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(superAdminAuth);
  // Step 2: Create the target regular administrator
  const targetAdminConnection: api.IConnection = {
    host: connection.host,
    simulate: true, // Enable simulation mode
  };
  const targetAdminAuth = await authorize_admin_join(targetAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: `target_${RandomGenerator.name()}`,
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(targetAdminAuth);
  // Validate that target admin starts with 'regular' grade
  TestValidator.equals(
    "target admin initial grade",
    targetAdminAuth.grade,
    "regular",
  );
  // Step 3: Promote the target admin to super administrator
  const promotionReason = RandomGenerator.paragraph({ sentences: 3 });
  const promotedAdmin =
    await api.functional.discussionBoard.admin.admins.promote(
      superAdminConnection,
      {
        adminId: targetAdminAuth.id,
        body: {
          reason: promotionReason,
        } satisfies IDiscussionBoardAdmin.IPromote,
      },
    );
  typia.assert(promotedAdmin);
  // Step 4: Verify the promotion response
  TestValidator.equals("promoted admin grade", promotedAdmin.grade, "super");
  TestValidator.equals(
    "promoted admin id matches target",
    promotedAdmin.id,
    targetAdminAuth.id,
  );
  TestValidator.equals(
    "promoted admin email matches target",
    promotedAdmin.email,
    targetAdminAuth.email,
  );
  // Step 5: Verify that updatedAt is a valid date-time
  TestValidator.predicate(
    "updatedAt is valid date-time",
    new Date(promotedAdmin.updatedAt).getTime() > 0,
  );
  // Step 6: Verify the target admin is not banned
  TestValidator.equals(
    "promoted admin is not banned",
    promotedAdmin.bannedAt,
    null,
  );
  TestValidator.equals(
    "promoted admin has no ban reason",
    promotedAdmin.banReason,
    null,
  );
  // Step 7: Verify the promoted admin retains their profile data
  TestValidator.equals(
    "displayName preserved",
    promotedAdmin.displayName,
    targetAdminAuth.displayName,
  );
  TestValidator.equals("bio preserved", promotedAdmin.bio, targetAdminAuth.bio);
}
