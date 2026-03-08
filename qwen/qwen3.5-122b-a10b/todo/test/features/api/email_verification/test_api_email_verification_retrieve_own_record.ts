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
 * Test email verification record retrieval for authenticated member.
 * 1. Register a new member (creates email verification record)
 * 2. Retrieve the verification record using verification ID
 * 3. Validate verification record structure and member ownership
 */
export async function test_api_email_verification_retrieve_own_record(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member (creates email verification record)
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Retrieve email verification record
  // Note: In real scenario, verification ID would be returned during registration
  // For testing, we use the member's ID as verification ID placeholder
  const verification =
    await api.functional.todoApp.member.email_verifications.at(
      memberConnection,
      {
        verificationId: authorized.id satisfies string & tags.Format<"uuid">,
      },
    );
  typia.assert(verification);
  // 3. Validate verification record structure
  TestValidator.equals(
    "verification ID is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      verification.id,
    ),
    true,
  );
  TestValidator.predicate(
    "expires_at is date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      verification.expires_at,
    ),
  );
  TestValidator.equals(
    "verified_at is null (not yet verified)",
    verification.verified_at,
    null,
  );
  // Validate member summary
  TestValidator.equals(
    "member ID matches",
    verification.member.id,
    authorized.id,
  );
  TestValidator.predicate(
    "member display_name exists",
    verification.member.display_name.length > 0,
  );
  TestValidator.predicate(
    "member created_at is date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      verification.member.created_at,
    ),
  );
  TestValidator.predicate(
    "member updated_at is date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      verification.member.updated_at,
    ),
  );
  TestValidator.equals(
    "member deleted_at is null",
    verification.member.deleted_at,
    null,
  );
}
