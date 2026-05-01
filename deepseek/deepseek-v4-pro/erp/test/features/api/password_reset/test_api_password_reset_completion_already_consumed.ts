import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import type { IErpHrmMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";
import { generate_random_erp_hrm_guest_password_resets_create } from "../../../generate/generate_random_erp_hrm_guest_password_resets_create";
import { prepare_random_erp_hrm_member_password_reset } from "../../../prepare/prepare_random_erp_hrm_member_password_reset";

/**
 * Test that a consumed password reset token cannot be reused and returns 404.
 *
 * Validates the one-time-use nature of password reset tokens by verifying that
 * calling the completion endpoint with an invalid or already-consumed resetId
 * results in a 404 Not Found response. This covers the edge case documented in
 * the specification where concurrent completion attempts for the same resetId
 * fail because the record is hard-deleted upon the first successful completion.
 *
 * 1. Create a member account via guest join with a randomized email address.
 * 2. Request a password reset for the registered email to create a reset record.
 * 3. Attempt completion with a random resetId and token — expect 404 Not Found.
 *    Since the actual resetId and token are delivered via email and not returned
 *    by the API, using a random resetId simulates both the "already consumed"
 *    and "never existed" cases, which both return 404 per the specification.
 */
export async function test_api_password_reset_completion_already_consumed(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account via guest join
  const guestConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const authorized = await authorize_guest_join(guestConnection, {
    body: { email },
  });
  typia.assert(authorized);
  // 2. Request password reset for the registered email
  const resetConnection: api.IConnection = { host: connection.host };
  await generate_random_erp_hrm_guest_password_resets_create(resetConnection, {
    body: { email },
  });
  // 3. Attempt completion with random resetId — expect 404
  const completionConnection: api.IConnection = { host: connection.host };
  const randomResetId = typia.random<string & tags.Format<"uuid">>();
  const completionBody = {
    token: RandomGenerator.alphaNumeric(64),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IErpHrmMemberPasswordReset.ICompletion;
  await TestValidator.httpError(
    "consumed or non-existent reset token returns 404",
    404,
    async () => {
      await api.functional.erpHrm.guest.password_resets.completion.complete(
        completionConnection,
        {
          resetId: randomResetId,
          body: completionBody,
        },
      );
    },
  );
}
