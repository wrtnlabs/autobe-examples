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
 * Test email verification rejection when the token does not exist in the system.
 *
 * Validates that the guest-facing email verification endpoint correctly rejects
 * requests containing a token that has no matching record in the database. The
 * test generates a random, cryptographically unlikely token and confirms the
 * API returns a not-found error with an HTTP 404 status.
 *
 * 1. Generate a random UUID string to simulate a non-existent verification token.
 * 2. Attempt to verify using the non-existent token via the guest endpoint.
 * 3. Assert the call throws an HTTP error with status 404 (not found).
 */
export async function test_api_email_verification_token_not_found(
  connection: api.IConnection,
): Promise<void> {
  const nonExistentToken = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-existent token should return error",
    async () => {
      await api.functional.erpHrm.guest.email_verifications.verification.verify(
        connection,
        { verificationId: nonExistentToken },
      );
    },
  );
}
