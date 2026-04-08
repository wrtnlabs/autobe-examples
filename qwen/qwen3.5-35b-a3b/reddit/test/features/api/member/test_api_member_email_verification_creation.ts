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
import { generate_random_reddit_platform_member_email_verifications_create } from "../../../generate/generate_random_reddit_platform_member_email_verifications_create";
import { prepare_random_reddit_platform_member_email_verification } from "../../../prepare/prepare_random_reddit_platform_member_email_verification";

export async function test_api_member_email_verification_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: (typia.random<string>() satisfies string & tags.Format<"uri"> as string & tags.Format<"uri">),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(auth);
  // 2. Create email verification token for the member
  const verification =
    await generate_random_reddit_platform_member_email_verifications_create(
      memberConnection,
      {
        body: {
          reddit_platform_member_id: auth.id,
          email: auth.email,
        } satisfies IRedditPlatformMemberEmailVerification.ICreate,
      },
    );
  typia.assert(verification);
  // 3. Validate email verification record
  TestValidator.predicate("token exists", verification.token.length > 0);
  TestValidator.predicate(
    "expires in future",
    new Date(verification.expires_at) > new Date(),
  );
  TestValidator.equals(
    "deleted_at is null (active)",
    verification.deleted_at,
    null,
  );
  TestValidator.equals("member id matches", verification.member.id, auth.id);
  TestValidator.equals("email matches", verification.email, auth.email);
}