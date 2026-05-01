import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random ERP HRM invitation creation data for E2E testing.
 *
 * Generates a complete IErpHrmInvitation.ICreate with randomized values
 * suitable for testing employee invitation flows. The email is a valid
 * RFC 5322 formatted address, and role_id is a valid UUID referencing an
 * existing role in the organization.
 *
 * Testers can override either property via the DeepPartial input to
 * control specific invitation scenarios such as duplicate email detection
 * or role assignment verification.
 */
export function prepare_random_erp_hrm_invitation(
  input?: DeepPartial<IErpHrmInvitation.ICreate>,
): IErpHrmInvitation.ICreate {
  return {
    email: input?.email ?? typia.random<string & tags.Format<"email">>(),
    role_id: input?.role_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
