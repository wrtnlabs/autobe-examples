import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberEmailVerification";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_platform_admin_email_verifications_create } from "../../../generate/generate_random_community_platform_admin_email_verifications_create";
import { prepare_random_community_platform_member_email_verification } from "../../../prepare/prepare_random_community_platform_member_email_verification";

export async function test_api_member_registration_email_verification_create_success(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const body = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: `user_${RandomGenerator.alphaNumeric(8)}`,
  } satisfies ICommunityPlatformMemberEmailVerification.ICreate;
  const member =
    await generate_random_community_platform_admin_email_verifications_create(
      adminConnection,
      {
        body,
      },
    );
  typia.assert(member);
  TestValidator.equals(
    "registered email matches input",
    member.email,
    body.email,
  );
  TestValidator.equals("email starts unverified", member.emailVerified, false);
  TestValidator.equals(
    "registration does not sign the member in",
    member.lastSignedInAt,
    null,
  );
  TestValidator.equals(
    "new member is not soft deleted",
    member.deletedAt,
    null,
  );
  TestValidator.predicate("member code is populated", member.code.length > 0);
  TestValidator.predicate(
    "member status is populated",
    member.status.length > 0,
  );
  TestValidator.predicate(
    "profile is included",
    member.profile !== null && member.profile !== undefined,
  );
  const unsafe = member as Record<string, unknown>;
  TestValidator.equals(
    "password_hash is not exposed",
    unsafe.password_hash,
    undefined,
  );
  TestValidator.equals(
    "passwordHash is not exposed",
    unsafe.passwordHash,
    undefined,
  );
  TestValidator.equals(
    "verification_token is not exposed",
    unsafe.verification_token,
    undefined,
  );
  TestValidator.equals(
    "verificationToken is not exposed",
    unsafe.verificationToken,
    undefined,
  );
  TestValidator.equals("session token is not exposed", unsafe.token, undefined);
}
