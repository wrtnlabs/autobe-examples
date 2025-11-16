import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * End-to-end test for administrator updating a moderator's editable business
 * attributes.
 *
 * Validates the following business rules and API constraints:
 *
 * 1. An authenticated administrator can update a moderator's email, status, and
 *    business_status.
 * 2. Email uniqueness is enforced; attempts to set an existing email are rejected.
 * 3. Only legal status values ('active', 'pending', 'suspended', 'banned') are
 *    accepted by the schema.
 * 4. Restricted fields and credential changes are not permitted through this
 *    endpoint and cannot be tested via type-safe API.
 * 5. Only an authenticated admin can perform the update; unauthenticated or
 *    insufficient privilege users are denied.
 *
 * Steps:
 *
 * - Register a new admin and obtain auth context.
 * - Set up two moderators (simulate with update for upsert).
 * - Successfully update mod1 by changing all allowed fields.
 * - Attempt to update mod1's email to mod2's, expect uniqueness rejection.
 * - Attempt to update as unauthenticated (no admin JWT), expect denial.
 */
export async function test_api_platform_moderator_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin agent with valid credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(10),
      business_status: `${RandomGenerator.name(1)}-lead`,
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // 2. Set up two moderators for uniqueness testing (upsert via PUT)
  const allowedStatuses = ["active", "pending", "suspended", "banned"] as const;
  const moderator1Id = typia.random<string & tags.Format<"uuid">>();
  const moderator2Id = typia.random<string & tags.Format<"uuid">>();
  const moderator1Email = typia.random<string & tags.Format<"email">>();
  const moderator2Email = typia.random<string & tags.Format<"email">>();

  let mod1 =
    await api.functional.communityPlatform.administrator.moderators.update(
      connection,
      {
        moderatorId: moderator1Id,
        body: {
          email: moderator1Email,
          status: RandomGenerator.pick(allowedStatuses),
          business_status: RandomGenerator.name(1),
        } satisfies ICommunityPlatformModerator.IUpdate,
      },
    );
  typia.assert(mod1);
  let mod2 =
    await api.functional.communityPlatform.administrator.moderators.update(
      connection,
      {
        moderatorId: moderator2Id,
        body: {
          email: moderator2Email,
          status: RandomGenerator.pick(allowedStatuses),
          business_status: "escalation-desk",
        } satisfies ICommunityPlatformModerator.IUpdate,
      },
    );
  typia.assert(mod2);

  // 3. Update mod1 (positive test: all allowed fields)
  const newEmail = typia.random<string & tags.Format<"email">>();
  const newStatus = RandomGenerator.pick(
    allowedStatuses.filter((x) => x !== mod1.status),
  );
  const newBusinessStatus = "campaign-lead";
  const updatedMod1 =
    await api.functional.communityPlatform.administrator.moderators.update(
      connection,
      {
        moderatorId: moderator1Id,
        body: {
          email: newEmail,
          status: newStatus,
          business_status: newBusinessStatus,
        } satisfies ICommunityPlatformModerator.IUpdate,
      },
    );
  typia.assert(updatedMod1);
  TestValidator.equals("mod1 email updated", updatedMod1.email, newEmail);
  TestValidator.equals("mod1 status updated", updatedMod1.status, newStatus);
  TestValidator.equals(
    "mod1 business_status updated",
    updatedMod1.business_status,
    newBusinessStatus,
  );

  // 4. Negative test: email uniqueness enforcement
  await TestValidator.error("email must be unique", async () => {
    await api.functional.communityPlatform.administrator.moderators.update(
      connection,
      {
        moderatorId: moderator1Id,
        body: {
          email: moderator2Email,
          status: newStatus,
        } satisfies ICommunityPlatformModerator.IUpdate,
      },
    );
  });

  // 5. Negative test: only authenticated admin can update (unauthenticated conn)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated users cannot update moderator",
    async () => {
      await api.functional.communityPlatform.administrator.moderators.update(
        unauthConn,
        {
          moderatorId: moderator1Id,
          body: {
            email: newEmail,
            status: newStatus,
          } satisfies ICommunityPlatformModerator.IUpdate,
        },
      );
    },
  );
}
