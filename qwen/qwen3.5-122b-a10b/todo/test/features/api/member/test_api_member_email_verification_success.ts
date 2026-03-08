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

export async function test_api_member_email_verification_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account (creates email verification record)
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(joinResult);
  // 2. Verify the email using the verification endpoint
  // Note: In real flow, token would be sent via email. For E2E testing,
  // we use a randomly generated token that the server will accept
  const verifyConnection: api.IConnection = { host: connection.host };
  const verification =
    await api.functional.todoApp.member.email_verifications.verify(
      verifyConnection,
      {
        body: {
          token: typia.random<string>(),
        } satisfies ITodoAppMemberEmailVerification.IRequest,
      },
    );
  typia.assert(verification);
  // 3. Validate the verification response
  TestValidator.predicate(
    "verification has valid id",
    verification.id !== undefined,
  );
  TestValidator.predicate(
    "verification has member",
    verification.member !== null && verification.member !== undefined,
  );
  TestValidator.predicate(
    "member has display name",
    verification.member.display_name.length > 0,
  );
  TestValidator.predicate(
    "verified_at is set after successful verification",
    verification.verified_at !== null,
  );
  TestValidator.predicate(
    "verification has expires_at",
    verification.expires_at !== undefined,
  );
  TestValidator.predicate(
    "verification has created_at",
    verification.created_at !== undefined,
  );
  TestValidator.predicate(
    "verification has updated_at",
    verification.updated_at !== undefined,
  );
  TestValidator.predicate(
    "verification has deleted_at",
    verification.deleted_at !== undefined,
  );
}
