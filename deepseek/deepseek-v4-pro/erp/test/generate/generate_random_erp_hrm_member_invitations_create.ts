import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_erp_hrm_invitation } from "../prepare/prepare_random_erp_hrm_invitation";

/**
 * Generate a random ERP HRM invitation via the API for E2E testing.
 *
 * Prepares random invitation data using the prepare function, then calls the
 * invitation creation endpoint. The invitation is created in pending status
 * within the current organization context.
 *
 * The generated invitation includes a random email address and role assignment.
 * Testers can override either property via the optional body parameter to
 * control specific invitation scenarios such as duplicate email detection
 * or role assignment verification.
 *
 * This operation requires the employee:manage permission in the organization.
 */
export async function generate_random_erp_hrm_member_invitations_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IErpHrmInvitation.ICreate> | undefined;
  },
): Promise<IErpHrmInvitation> {
  const prepared: IErpHrmInvitation.ICreate = prepare_random_erp_hrm_invitation(
    props.body,
  );
  const result: IErpHrmInvitation =
    await api.functional.erpHrm.member.invitations.create(connection, {
      body: prepared,
    });
  return result;
}
