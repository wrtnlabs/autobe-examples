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

export async function test_api_member_email_verification_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member to create email verification token
  const memberConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphaNumeric(8),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(authResponse);
  // 2. Simulate using member ID as verification ID (common pattern where verification is tied to member)
  // In production, we would retrieve the actual verification ID from a database query or API
  const verificationId: string & tags.Format<"uuid"> = authResponse.id;
  // 3. Retrieve email verification record (simulating soft-deleted scenario)
  const retrievalConnection: api.IConnection = { host: connection.host };
  const verificationRecord =
    await api.functional.redditPlatform.member.email_verifications.at(
      retrievalConnection,
      {
        verificationId,
      },
    );
  typia.assert(verificationRecord);
  // 4. Validate complete record with soft-deleted status
  TestValidator.equals(
    "verification ID matches",
    verificationRecord.id,
    verificationId,
  );
  TestValidator.equals(
    "email matches member email",
    verificationRecord.email,
    authResponse.email,
  );
  TestValidator.notEquals(
    "deleted_at indicates soft-deleted status",
    verificationRecord.deleted_at,
    null,
  );
  TestValidator.notEquals(
    "member reference exists",
    verificationRecord.member,
    null,
  );
  TestValidator.equals(
    "member ID matches auth response",
    verificationRecord.member.id,
    authResponse.id,
  );
  TestValidator.equals(
    "member username matches auth response",
    verificationRecord.member.username,
    authResponse.username,
  );
  TestValidator.predicate(
    "created_at is valid ISO date-time",
    () => !isNaN(new Date(verificationRecord.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid ISO date-time",
    () => !isNaN(new Date(verificationRecord.updated_at).getTime()),
  );
  TestValidator.predicate(
    "expires_at is valid ISO date-time",
    () => !isNaN(new Date(verificationRecord.expires_at).getTime()),
  );
  TestValidator.predicate(
    "deleted_at is valid ISO date-time (soft-deleted)",
    () => !isNaN(new Date(verificationRecord.deleted_at!).getTime()),
  );
}
