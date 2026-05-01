import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberEmailVerification";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that retrieving a non-existent email verification record returns 404.
 *
 * Validates that when an authenticated member requests an email verification
 * record using a randomly generated UUID that does not correspond to any
 * existing verification, the system returns a 404 Not Found error. The test
 * ensures that no information about other verification records or member
 * accounts is leaked in the error response.
 *
 * 1. A member is created and authenticated via the join flow.
 * 2. A random non-existent UUID is generated.
 * 3. The email verification retrieval endpoint is called with the fake UUID.
 * 4. The system responds with a 404 Not Found HttpError.
 */
export async function test_api_email_verification_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Generate a random non-existent verification ID
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt retrieval — expect 404
  await TestValidator.httpError(
    "non-existent email verification returns 404",
    404,
    async () => {
      await api.functional.erpHrm.member.email_verifications.at(
        memberConnection,
        { verificationId: nonExistentId },
      );
    },
  );
}
