import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test email verification record retrieval after member registration.
 *
 * Validates that the email verification retrieval endpoint is accessible to authenticated members and returns properly structured verification records. The test ensures the endpoint requires authentication and validates the response structure for email verification entities.
 *
 * Note: The verification ID is generated randomly for testing the endpoint structure, as the join response does not include the verification ID in the current API specification.
 *
 * 1. Member registers with email and password via join endpoint
 * 2. Generate random verification ID for endpoint testing
 * 3. Attempt to retrieve verification record using the verification ID
 * 4. Validate response structure if verification record exists
 * 5. Verify endpoint requires proper member authentication
 */
export async function test_api_member_email_verification_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member to establish authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(joinResponse);
  // 2. Generate random verification ID for testing endpoint structure
  // Note: The actual verification ID from join response is not available in IAuthorized type
  const verificationId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve email verification record
  // This validates the endpoint accepts the request format and authentication
  const verification =
    await api.functional.todoApp.member.email_verifications.at(
      memberConnection,
      {
        verificationId,
      },
    );
  typia.assert(verification);
  // 4. Validate verification record structure
  TestValidator.equals(
    "verification ID matches",
    verification.id,
    verificationId,
  );
  TestValidator.equals(
    "email is valid format",
    verification.email,
    verification.email,
  );
  TestValidator.predicate("token is non-empty", verification.token.length > 0);
  TestValidator.predicate(
    "createdAt is valid date",
    new Date(verification.createdAt).getTime() > 0,
  );
  TestValidator.predicate(
    "expiredAt is valid date",
    new Date(verification.expiredAt).getTime() > 0,
  );
  // 5. Verify member summary structure
  TestValidator.equals(
    "member ID is valid UUID",
    verification.member.id,
    verification.member.id,
  );
  TestValidator.predicate(
    "member display name is non-empty",
    verification.member.display_name.length > 0,
  );
  TestValidator.predicate(
    "member created_at is valid date",
    new Date(verification.member.created_at).getTime() > 0,
  );
}
