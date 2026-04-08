import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_member_password_reset } from "../prepare/prepare_random_hrm_member_password_reset";

/**
 * Generate a random HRM member password reset request via the API for E2E testing.
 *
 * Prepares random password reset data using the prepare function, then calls the creation endpoint to initiate a password reset request for a member account by email.
 *
 * This function generates a password reset token for the specified email address. If the email corresponds to an existing, active member account, a one-time use token is created and sent to the member's email address. The response does not indicate whether the email exists in the system to prevent email enumeration attacks.
 *
 * @param connection - The API connection object containing host and authentication details
 * @param props - Configuration properties for the generation
 * @param props.body - Optional partial input to override specific fields in the password reset request
 * @returns Promise resolving to void (API returns success status without exposing token data)
 *
 * @example
 *   ```typescript
 *   // Generate password reset for a specific email
 *   await generate_random_hrm_member_member_password_resets_create(connection, {
 *     body: { email: "test@example.com" }
 *   });
 *
 *   // Generate with random email
 *   await generate_random_hrm_member_member_password_resets_create(connection, {});
 *   ```
 */
export async function generate_random_hrm_member_member_password_resets_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmMemberPasswordReset.ICreate>;
  },
): Promise<void> {
  const prepared: IHrmMemberPasswordReset.ICreate =
    prepare_random_hrm_member_password_reset(props.body);
  const result: void =
    await api.functional.hrm.member.member.password_resets.create(connection, {
      body: prepared,
    });
  return result;
}
