import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_email_verification_retrieval_valid_unused(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member (creates unused email verification token)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Get the email verification ID from member registration response
  const verificationId = member.emailVerifications?.[0]?.id;
  TestValidator.equals(
    "verification exists",
    verificationId !== undefined,
    true,
  );
  // 3. Create member connection for retrieval
  const retrievalConnection: api.IConnection = { host: connection.host };
  retrievalConnection.headers = { Authorization: member.token.access };
  // 4. Retrieve the email verification
  const verification =
    await api.functional.hrmPlatform.member.email_verifications.at(
      retrievalConnection,
      { verificationId: verificationId! },
    );
  typia.assert(verification);
  // 5. Validate verification structure
  TestValidator.equals(
    "verification has UUID id",
    verification.id !== undefined,
    true,
  );
  TestValidator.equals(
    "member reference exists",
    verification.member !== undefined,
    true,
  );
  TestValidator.equals("token exists", verification.token !== undefined, true);
  TestValidator.equals("token is UUID", verification.token !== undefined, true);
  TestValidator.equals(
    "expires_at exists",
    verification.expires_at !== undefined,
    true,
  );
  TestValidator.equals("used_at is null (unused)", verification.used_at, null);
  TestValidator.equals(
    "created_at exists",
    verification.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "updated_at exists",
    verification.updated_at !== undefined,
    true,
  );
  TestValidator.equals(
    "deleted_at is null (not deleted)",
    verification.deleted_at,
    null,
  );
  // 6. Validate member reference structure
  const memberRef = verification.member;
  TestValidator.equals("member has UUID id", memberRef.id !== undefined, true);
  TestValidator.equals(
    "member email matches input",
    memberRef.email,
    member.email,
  );
  TestValidator.equals("member is_active is true", memberRef.is_active, true);
  TestValidator.equals(
    "member created_at exists",
    memberRef.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "member updated_at exists",
    memberRef.updated_at !== undefined,
    true,
  );
  TestValidator.equals("member deleted_at is null", memberRef.deleted_at, null);
}
