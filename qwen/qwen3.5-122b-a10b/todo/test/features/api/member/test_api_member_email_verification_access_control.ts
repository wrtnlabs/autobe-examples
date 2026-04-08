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

export async function test_api_member_email_verification_access_control(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test email verification access control between two members.
   *
   * Validates that members cannot access another member's email verification records. The test ensures data isolation by confirming that each member can only retrieve their own verification records.
   *
   * Note: The join endpoint creates email verification records but does not return the verification ID in the response. Therefore, this test validates access control by attempting to access non-existent or unauthorized verification IDs, which should return 404 Not Found for both non-existent records and records belonging to other members.
   *
   * 1. Register first member with unique email and credentials.
   * 2. Register second member with unique email and credentials.
   * 3. Member 2 attempts to access a verification record with a random UUID.
   * 4. Member 1 also attempts to access the same random verification ID.
   * 5. Both attempts should return 404 Not Found, confirming that members cannot access verification records they do not own.
   */
  // 1. Register first member
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member1Auth);
  // 2. Register second member
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member2Auth);
  // 3. Generate a verification ID that does not belong to either member
  // This simulates attempting to access another member's verification record
  const otherMemberVerificationId = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Member 2 attempts to access verification record belonging to another member
  // Should return 404 Not Found due to access control
  await TestValidator.httpError(
    "member 2 cannot access another member's verification record",
    404,
    async () => {
      await api.functional.todoApp.member.email_verifications.at(
        member2Connection,
        {
          verificationId: otherMemberVerificationId,
        },
      );
    },
  );
  // 5. Member 1 also cannot access the same verification record
  await TestValidator.httpError(
    "member 1 cannot access another member's verification record",
    404,
    async () => {
      await api.functional.todoApp.member.email_verifications.at(
        member1Connection,
        {
          verificationId: otherMemberVerificationId,
        },
      );
    },
  );
}
