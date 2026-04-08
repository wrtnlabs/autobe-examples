import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_email_verification_retrieve(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member (creates email verification token in the system)
  const joinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(6) + "_" + RandomGenerator.alphaNumeric(4),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Create a separate connection for verification retrieval
  // Following connection isolation pattern - never use base connection directly
  const verificationConnection: api.IConnection = { host: connection.host };
  // 3. Generate a verification ID and retrieve the record
  // In production, this would come from the registration response or email link
  const verificationId = typia.random<string & tags.Format<"uuid">>();
  // 4. Retrieve email verification record
  const verification =
    await api.functional.redditPlatform.member.email_verifications.at(
      verificationConnection,
      {
        verificationId,
      },
    );
  typia.assert(verification);
  // 5. Validate response structure
  TestValidator.equals(
    "verification id matches",
    verification.id,
    verificationId,
  );
  TestValidator.equals(
    "verification email matches registration",
    verification.email,
    authorized.email,
  );
  TestValidator.equals(
    "verification member id matches",
    verification.member.id,
    authorized.id,
  );
  TestValidator.equals(
    "verification member username matches",
    verification.member.username,
    authorized.username,
  );
  TestValidator.predicate(
    "member karma is valid integer",
    typeof verification.member.karma === "number",
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    verification.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    verification.updated_at !== undefined,
  );
  TestValidator.predicate(
    "expires_at is valid future date-time",
    verification.expires_at !== undefined,
  );
  TestValidator.equals(
    "deleted_at is null (active)",
    verification.deleted_at,
    null,
  );
}
