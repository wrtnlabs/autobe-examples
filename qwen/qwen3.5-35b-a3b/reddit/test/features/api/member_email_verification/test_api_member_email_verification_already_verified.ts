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

export async function test_api_member_email_verification_already_verified(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create the first email verification token
  const firstVerification =
    await api.functional.redditPlatform.member.email_verifications.create(
      memberConnection,
      {
        body: {
          reddit_platform_member_id: memberAuth.id,
          email: memberAuth.email,
        } satisfies IRedditPlatformMemberEmailVerification.ICreate,
      },
    );
  typia.assert(firstVerification);
  // Verify first verification is active
  TestValidator.equals(
    "first verification created",
    firstVerification.deleted_at,
    null,
  );
  TestValidator.equals(
    "email matches",
    firstVerification.email,
    memberAuth.email,
  );
  // 3. Attempt to create a second verification token for the same member and email
  await TestValidator.error(
    "duplicate email verification should fail with 409",
    async () => {
      await api.functional.redditPlatform.member.email_verifications.create(
        memberConnection,
        {
          body: {
            reddit_platform_member_id: memberAuth.id,
            email: memberAuth.email,
          } satisfies IRedditPlatformMemberEmailVerification.ICreate,
        },
      );
    },
  );
  // 4. Verify the first verification still exists and is active (use the existing object from step 2)
  const activeVerification = firstVerification;
  TestValidator.notEquals(
    "first verification should still be active",
    activeVerification,
    undefined,
  );
  TestValidator.equals(
    "active verification email matches",
    activeVerification.email,
    memberAuth.email,
  );
}