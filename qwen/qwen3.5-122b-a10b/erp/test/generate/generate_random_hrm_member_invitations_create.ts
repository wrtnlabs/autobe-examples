import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployeeInvitation";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_employee_invitation } from "../prepare/prepare_random_hrm_employee_invitation";

/**
 * Generate a random employee invitation via the API for E2E testing.
 *
 * Prepares random employee invitation data using the prepare function, then calls the creation endpoint to send an invitation to the specified email address.
 *
 * This function creates an invitation record that allows an organization member to invite a user (by email) to join the organization as an employee with a specific role. The invitation includes a unique token sent via email for secure acceptance.
 *
 * **Usage**
 *
 * Call this function with an authenticated connection that has the `employee:manage` permission in the organization context. The function will generate a complete invitation record with randomized values for email, role_id, and optional expiration date.
 *
 * @param connection The API connection with authentication context
 * @param props Properties including optional partial invitation data for customization
 * @returns The created invitation record with token, expiration date, and status
 */
export async function generate_random_hrm_member_invitations_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmEmployeeInvitation.ICreate>;
  },
): Promise<IHrmEmployeeInvitation> {
  const prepared: IHrmEmployeeInvitation.ICreate =
    prepare_random_hrm_employee_invitation(props.body);
  const result: IHrmEmployeeInvitation =
    await api.functional.hrm.member.invitations.create(connection, {
      body: prepared,
    });
  return result;
}
