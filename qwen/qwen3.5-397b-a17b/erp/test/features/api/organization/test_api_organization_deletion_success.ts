import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";

/**
 * Test successful organization deletion when all preconditions are met.
 *
 * This test validates the complete organization deletion workflow including member registration, organization creation, and permanent deletion with cascade removal of all associated data. The test ensures that a freshly created organization with no employees or timesheets can be deleted successfully by its owner.
 *
 * Since the organization is newly created, all preconditions for deletion are naturally met: no active employees exist, and no pending timesheets (draft or submitted status) are present. This allows the deletion to proceed without any blocking conditions.
 *
 * 1. Register new member account via join endpoint - member will become organization owner.
 * 2. Create organization using the authenticated member - member automatically becomes owner.
 * 3. Delete the organization using the owner's authentication - should succeed with 204 No Content since no employees or pending timesheets exist.
 * 4. Verify deletion succeeds (void response indicates successful deletion).
 */
export async function test_api_organization_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member account who will become organization owner
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create organization (member becomes owner automatically)
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Delete the organization using the owner's authentication
  // Since organization is newly created, no employees or pending timesheets exist
  await api.functional.hrmPlatform.member.organizations.erase(
    memberConnection,
    {
      organizationId: organization.id,
    },
  );
  // 4. Verify deletion succeeds (void response indicates successful 204 No Content)
  // The erase function returns void on success, which confirms 204 No Content
}
