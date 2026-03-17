import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberPasswordReset";
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
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_admin_password_resets_create } from "../../../generate/generate_random_community_platform_admin_password_resets_create";
import { prepare_random_community_platform_member_password_reset } from "../../../prepare/prepare_random_community_platform_member_password_reset";

export async function test_api_password_reset_request_repeat_issue_lifecycle(
  connection: api.IConnection,
): Promise<void> {
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(
    16,
  ) satisfies string as string;
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.Format<"password">>();
  const adminJoinConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminJoinConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const memberJoinConnection: api.IConnection = { host: connection.host };
  const joinedMember = await authorize_member_join(memberJoinConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(joinedMember);
  const memberLoginBeforeConnection: api.IConnection = {
    host: connection.host,
  };
  const loginBefore = await authorize_member_login(
    memberLoginBeforeConnection,
    {
      body: {
        email: memberEmail,
        password: memberPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies ICommunityPlatformMember.ILogin,
    },
  );
  typia.assert(loginBefore);
  const firstResetInput = {
    email: memberEmail,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformMemberPasswordReset.ICreate;
  const firstReset =
    await generate_random_community_platform_admin_password_resets_create(
      adminJoinConnection,
      {
        body: firstResetInput,
      },
    );
  typia.assert(firstReset);
  TestValidator.equals(
    "first reset member id matches joined member",
    firstReset.member.id,
    joinedMember.id,
  );
  TestValidator.equals(
    "first reset member email matches member email",
    firstReset.member.email,
    memberEmail,
  );
  TestValidator.equals(
    "first reset href matches request",
    firstReset.href,
    firstResetInput.href,
  );
  TestValidator.equals(
    "first reset referrer matches request",
    firstReset.referrer,
    firstResetInput.referrer,
  );
  TestValidator.equals(
    "first reset ip matches request",
    firstReset.ip,
    firstResetInput.ip,
  );
  TestValidator.equals(
    "first reset used_at starts null",
    firstReset.used_at,
    null,
  );
  TestValidator.equals(
    "first reset revoked_at starts null",
    firstReset.revoked_at,
    null,
  );
  TestValidator.equals(
    "first reset deleted_at starts null",
    firstReset.deleted_at,
    null,
  );
  const secondResetInput = {
    email: memberEmail,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformMemberPasswordReset.ICreate;
  const secondReset =
    await generate_random_community_platform_admin_password_resets_create(
      adminJoinConnection,
      {
        body: secondResetInput,
      },
    );
  typia.assert(secondReset);
  TestValidator.notEquals(
    "second reset id differs from first",
    secondReset.id,
    firstReset.id,
  );
  TestValidator.equals(
    "second reset member id matches joined member",
    secondReset.member.id,
    joinedMember.id,
  );
  TestValidator.equals(
    "second reset member email matches member email",
    secondReset.member.email,
    memberEmail,
  );
  TestValidator.equals(
    "second reset href matches request",
    secondReset.href,
    secondResetInput.href,
  );
  TestValidator.equals(
    "second reset referrer matches request",
    secondReset.referrer,
    secondResetInput.referrer,
  );
  TestValidator.equals(
    "second reset ip matches request",
    secondReset.ip,
    secondResetInput.ip,
  );
  TestValidator.equals(
    "second reset used_at starts null",
    secondReset.used_at,
    null,
  );
  TestValidator.equals(
    "second reset deleted_at starts null",
    secondReset.deleted_at,
    null,
  );
  TestValidator.predicate(
    "second expiration is not older than first",
    new Date(secondReset.expired_at).getTime() >=
      new Date(firstReset.expired_at).getTime(),
  );
  if (firstReset.revoked_at !== null) {
    TestValidator.equals(
      "second reset remains active under single token policy",
      secondReset.revoked_at,
      null,
    );
    TestValidator.predicate(
      "first reset revocation timestamp is valid",
      new Date(firstReset.revoked_at).getTime() >=
        new Date(firstReset.created_at).getTime(),
    );
  } else {
    TestValidator.equals(
      "first reset remains active when multiple active tokens allowed",
      firstReset.revoked_at,
      null,
    );
    TestValidator.equals(
      "second reset also remains active when multiple active tokens allowed",
      secondReset.revoked_at,
      null,
    );
  }
  const memberLoginAfterConnection: api.IConnection = { host: connection.host };
  const loginAfter = await authorize_member_login(memberLoginAfterConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.ILogin,
  });
  typia.assert(loginAfter);
  TestValidator.equals(
    "member id unchanged after repeated reset issuance",
    loginAfter.id,
    joinedMember.id,
  );
  TestValidator.equals(
    "member email unchanged after repeated reset issuance",
    loginAfter.email,
    joinedMember.email,
  );
  TestValidator.equals(
    "member code unchanged after repeated reset issuance",
    loginAfter.code,
    joinedMember.code,
  );
  TestValidator.equals(
    "member status unchanged after repeated reset issuance",
    loginAfter.status,
    joinedMember.status,
  );
  TestValidator.equals(
    "member deletion state unchanged after repeated reset issuance",
    loginAfter.deletedAt,
    joinedMember.deletedAt,
  );
  TestValidator.equals(
    "member email verification unchanged after repeated reset issuance",
    loginAfter.emailVerified,
    joinedMember.emailVerified,
  );
  TestValidator.equals(
    "member id stable across pre-reset login",
    loginBefore.id,
    joinedMember.id,
  );
  TestValidator.equals(
    "member email stable across pre-reset login",
    loginBefore.email,
    joinedMember.email,
  );
  TestValidator.equals(
    "member code stable across pre-reset login",
    loginBefore.code,
    joinedMember.code,
  );
  TestValidator.equals(
    "member status stable across pre-reset login",
    loginBefore.status,
    joinedMember.status,
  );
  TestValidator.equals(
    "member deletion state stable across pre-reset login",
    loginBefore.deletedAt,
    joinedMember.deletedAt,
  );
  TestValidator.equals(
    "member email verification stable across pre-reset login",
    loginBefore.emailVerified,
    joinedMember.emailVerified,
  );
  TestValidator.equals(
    "member id stable across repeated normal logins",
    loginAfter.id,
    loginBefore.id,
  );
  TestValidator.equals(
    "member email stable across repeated normal logins",
    loginAfter.email,
    loginBefore.email,
  );
  TestValidator.equals(
    "member code stable across repeated normal logins",
    loginAfter.code,
    loginBefore.code,
  );
  TestValidator.equals(
    "member status stable across repeated normal logins",
    loginAfter.status,
    loginBefore.status,
  );
  TestValidator.equals(
    "member deletion state stable across repeated normal logins",
    loginAfter.deletedAt,
    loginBefore.deletedAt,
  );
  TestValidator.equals(
    "member email verification stable across repeated normal logins",
    loginAfter.emailVerified,
    loginBefore.emailVerified,
  );
}
