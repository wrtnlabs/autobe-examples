import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test that a consumed email verification token cannot be reused for verification.
 *
 * Validates the one-time-use constraint on email verification tokens generated
 * during member sign-up. After a token has been successfully consumed — indicated
 * by a populated `verified_at` timestamp — any subsequent attempt to verify the
 * same token must be rejected.
 *
 * 1. Creates a member account via guest join, which generates an email
 *    verification token in the system.
 * 2. Calls the verify endpoint with the token — the first call succeeds and
 *    consumes the token, populating `verified_at`.
 * 3. Calls the verify endpoint a second time with the identical token — the
 *    system rejects this duplicate attempt, confirming consumed tokens are
 *    irrevocable.
 */
export async function test_api_email_verification_already_consumed(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account via guest join
  const guestConnection: api.IConnection = { host: connection.host };
  const member = await authorize_guest_join(guestConnection, {});
  typia.assert(member);
  // 2. First verification — consumes the token, populates verified_at
  const verificationToken = RandomGenerator.alphaNumeric(64);
  const firstVerification =
    await api.functional.erpHrm.guest.email_verifications.verification.verify(
      { host: connection.host },
      { verificationId: verificationToken },
    );
  typia.assert(firstVerification);
  // 3. Second verification with the same token — must be rejected
  await TestValidator.error(
    "consumed verification token should be rejected on second attempt",
    async () => {
      await api.functional.erpHrm.guest.email_verifications.verification.verify(
        { host: connection.host },
        { verificationId: verificationToken },
      );
    },
  );
}
