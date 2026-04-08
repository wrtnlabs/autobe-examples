import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test retrieving a non-existent email verification record returns 404.
 *
 * Validates that attempting to retrieve an email verification record with a non-existent UUID properly returns an HTTP 404 Not Found error. This ensures the API correctly handles requests for verification records that do not exist in the system.
 *
 * The test authenticates as a member and then attempts to retrieve a verification record using a randomly generated UUID that is guaranteed not to exist in the database.
 *
 * 1. Authenticate as a member using the authorize_member_join utility
 * 2. Generate a random UUID that doesn't correspond to any existing verification
 * 3. Attempt to retrieve the non-existent verification record
 * 4. Validate that the API throws an HTTP 404 error
 */
export async function test_api_email_verification_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Generate a non-existent verification ID
  const nonExistentVerificationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve non-existent verification and validate 404 error
  await TestValidator.httpError(
    "should return 404 for non-existent verification",
    404,
    async () =>
      await api.functional.hrmTimeTrack.member.email_verifications.at(
        memberConnection,
        {
          verificationId: nonExistentVerificationId,
        },
      ),
  );
}
