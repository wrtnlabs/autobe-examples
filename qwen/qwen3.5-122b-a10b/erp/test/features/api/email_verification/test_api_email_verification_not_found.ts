import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMemberEmailVerification";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test retrieval of non-existent email verification record.
 *
 * Validates that attempting to access an email verification record with an invalid or non-existent verification ID returns a 404 Not Found error. This ensures proper error handling for invalid verification links and prevents information leakage about whether specific verification IDs exist in the system.
 *
 * The test follows these steps:
 * 1. Register a new member account with email and password credentials
 * 2. Generate a random UUID that does not correspond to any existing verification record
 * 3. Attempt to retrieve the email verification record using the non-existent ID
 * 4. Validate that the system returns a 404 Not Found error response
 *
 * This negative test scenario confirms that the API properly handles requests for non-existent resources without exposing sensitive information about the database state.
 */
export async function test_api_email_verification_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  // 2. Generate a non-existent verification ID
  const nonExistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve the non-existent verification record
  await TestValidator.httpError(
    "email verification not found",
    404,
    async () => {
      await api.functional.hrm.member.member.email_verifications.at(
        memberConnection,
        {
          verificationId: nonExistentId,
        },
      );
    },
  );
}
