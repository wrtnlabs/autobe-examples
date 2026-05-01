import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_erp_hrm_member_password_reset } from "../prepare/prepare_random_erp_hrm_member_password_reset";

/**
 * Generate a random password reset request via the API for E2E testing.
 *
 * Prepares random password reset data using the prepare function, then calls the
 * password reset initiation endpoint. The API always returns 204 No Content
 * regardless of whether the email exists in the system, so this function has a
 * void return type.
 *
 * The prepare function generates a valid RFC 5322 email address by default.
 * Callers can override the email via `props.body.email` to test various scenarios
 * such as unregistered emails or edge cases.
 */
export async function generate_random_erp_hrm_member_password_resets_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IErpHrmMemberPasswordReset.ICreate> | undefined;
  },
): Promise<void> {
  const prepared: IErpHrmMemberPasswordReset.ICreate =
    prepare_random_erp_hrm_member_password_reset(props.body);
  return await api.functional.erpHrm.member.password_resets.create(connection, {
    body: prepared,
  });
}
