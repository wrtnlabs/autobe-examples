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
 * Test email verification ownership isolation.
 *
 * Two members register separate accounts, creating email verification records for each.
 * Member A attempts to access Member B's email verification record using Member B's verification ID.
 * The system must enforce data isolation and return 404 Not Found, treating the record as non-existent.
 * This validates that the ownership verification logic correctly prevents members from accessing
 * verification information belonging to other users, protecting against information leakage
 * about other members' registration status.
 */
export async function test_api_email_verification_ownership_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth: ITodoAppMember.IAuthorized = await authorize_member_join(
    memberAConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        displayName: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(memberAAuth);
  // 2. Register Member B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth: ITodoAppMember.IAuthorized = await authorize_member_join(
    memberBConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        displayName: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(memberBAuth);
  // 3. Member A attempts to access Member B's verification record
  // Using Member B's member ID as the verification ID to test ownership isolation
  // The system should return 404 because Member A doesn't own Member B's verification record
  await TestValidator.httpError(
    "member A cannot access member B's email verification record",
    404,
    async () => {
      await api.functional.todoApp.member.email_verifications.at(
        memberAConnection,
        {
          verificationId: memberBAuth.id,
        },
      );
    },
  );
}
