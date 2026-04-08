import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeInvitation";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_platform_employee_invitation } from "../prepare/prepare_random_hrm_platform_employee_invitation";

/**
 * Generate a random employee invitation via the API for E2E testing.
 *
 * Prepares random employee invitation data using the prepare function, then calls the creation endpoint to invite a new employee to join the organization. The invitation includes email address, role assignment, optional department and position, employment type classification, and expiration timestamp.
 *
 * If the invited email already has a user account, the user is immediately added to the organization as an employee. If no account exists, a pending invitation is created and the user will be automatically added when they sign up with that email.
 *
 * @param connection - The API connection for making HTTP requests
 * @param props - Optional configuration with body data overrides
 * @param props.body - Partial creation data to override random generation
 * @returns The created employee invitation record with full details including organization, role, and invitedBy relations
 */
export async function generate_random_hrm_platform_member_employee_invitations_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmPlatformEmployeeInvitation.ICreate>;
  },
): Promise<IHrmPlatformEmployeeInvitation> {
  const prepared: IHrmPlatformEmployeeInvitation.ICreate =
    prepare_random_hrm_platform_employee_invitation(props.body);
  const result: IHrmPlatformEmployeeInvitation =
    await api.functional.hrmPlatform.member.employee_invitations.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
