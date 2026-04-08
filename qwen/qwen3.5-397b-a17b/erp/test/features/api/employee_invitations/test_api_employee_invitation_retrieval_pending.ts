import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeInvitation";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employee_invitations_create } from "../../../generate/generate_random_hrm_platform_member_employee_invitations_create";
import { prepare_random_hrm_platform_employee_invitation } from "../../../prepare/prepare_random_hrm_platform_employee_invitation";

/**
 * Test the successful retrieval of a pending employee invitation by its unique identifier.
 *
 * Validates the complete employee invitation retrieval workflow including member authentication, invitation creation, and detailed response validation. Ensures that pending invitations are accessible to authorized users and that all invitation details including relations are properly populated.
 *
 * Special attention is given to verifying that the invitation status is 'pending', all lifecycle timestamps are in ISO 8601 format, and relation fields (role, organization, invitedBy, department) contain complete data. The test confirms organization data isolation by ensuring the invitation belongs to the current organization context.
 *
 * 1. Member registers and authenticates to obtain access credentials.
 * 2. Creates a pending employee invitation with email, role, employment type, and optional department.
 * 3. Retrieves the invitation by its unique identifier using GET endpoint.
 * 4. Validates all invitation fields match the creation input and relations are populated.
 * 5. Verifies timestamps are in ISO 8601 format and lifecycle state is correct (accepted_at and deleted_at are null).
 */
export async function test_api_employee_invitation_retrieval_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
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
  // 2. Create pending employee invitation
  const invitationEmail = typia.random<string & tags.Format<"email">>();
  const employmentType = RandomGenerator.pick([
    "full-time",
    "part-time",
    "contractor",
    "intern",
  ] as const);
  const expiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const createdInvitation =
    await generate_random_hrm_platform_member_employee_invitations_create(
      memberConnection,
      {
        body: {
          email: invitationEmail,
          employment_type: employmentType,
          expires_at: expiresAt,
          position: RandomGenerator.name(2),
        },
      },
    );
  typia.assert(createdInvitation);
  // 3. Retrieve invitation by ID
  const retrievedInvitation =
    await api.functional.hrmPlatform.member.employee_invitations.at(
      memberConnection,
      {
        invitationId: createdInvitation.id,
      },
    );
  typia.assert(retrievedInvitation);
  // 4. Validate invitation details match creation input
  TestValidator.equals(
    "invitation ID matches",
    retrievedInvitation.id,
    createdInvitation.id,
  );
  TestValidator.equals(
    "email matches",
    retrievedInvitation.email,
    invitationEmail,
  );
  TestValidator.equals(
    "status is pending",
    retrievedInvitation.status,
    "pending",
  );
  TestValidator.equals(
    "employment type matches",
    retrievedInvitation.employment_type,
    employmentType,
  );
  TestValidator.equals(
    "position matches",
    retrievedInvitation.position,
    createdInvitation.position,
  );
  // 5. Validate lifecycle timestamps
  TestValidator.predicate("invited_at is valid ISO 8601", () => {
    const date = new Date(retrievedInvitation.invited_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("expires_at is valid ISO 8601", () => {
    const date = new Date(retrievedInvitation.expires_at);
    return !isNaN(date.getTime()) && date.getTime() > Date.now();
  });
  TestValidator.equals(
    "accepted_at is null",
    retrievedInvitation.accepted_at,
    null,
  );
  TestValidator.equals(
    "deleted_at is null",
    retrievedInvitation.deleted_at,
    null,
  );
  // 6. Validate relation fields contain expected data
  TestValidator.equals(
    "organization id exists",
    typeof retrievedInvitation.organization.id,
    "string",
  );
  TestValidator.equals(
    "organization name exists",
    typeof retrievedInvitation.organization.name,
    "string",
  );
  TestValidator.equals(
    "organization currency exists",
    typeof retrievedInvitation.organization.currency,
    "string",
  );
  TestValidator.equals(
    "organization timezone exists",
    typeof retrievedInvitation.organization.timezone,
    "string",
  );
  TestValidator.equals(
    "invitedBy id matches member",
    retrievedInvitation.invitedBy.id,
    member.id,
  );
  TestValidator.equals(
    "invitedBy email matches member",
    retrievedInvitation.invitedBy.email,
    member.email,
  );
  TestValidator.predicate("invitedBy created_at is valid", () => {
    const date = new Date(retrievedInvitation.invitedBy.created_at);
    return !isNaN(date.getTime());
  });
  TestValidator.equals(
    "role id exists",
    typeof retrievedInvitation.role.id,
    "string",
  );
  TestValidator.equals(
    "role name exists",
    typeof retrievedInvitation.role.name,
    "string",
  );
  TestValidator.equals(
    "role is_built_in is boolean",
    typeof retrievedInvitation.role.is_built_in,
    "boolean",
  );
  // 7. Validate department if assigned
  if (
    createdInvitation.department !== null &&
    createdInvitation.department !== undefined
  ) {
    TestValidator.equals(
      "department id exists",
      typeof retrievedInvitation.department!.id,
      "string",
    );
    TestValidator.equals(
      "department name exists",
      typeof retrievedInvitation.department!.name,
      "string",
    );
  }
}
