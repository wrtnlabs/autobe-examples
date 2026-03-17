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

export async function test_api_password_reset_recovery_completion_success(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const originalPassword = typia.random<string & tags.Format<"password">>();
  const memberJoinConnection: api.IConnection = { host: connection.host };
  const memberJoin = await authorize_member_join(memberJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: originalPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberJoin);
  const resetRequest =
    await generate_random_community_platform_admin_password_resets_create(
      adminConnection,
      {
        body: {
          email: memberJoin.email,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        },
      },
    );
  typia.assert(resetRequest);
  const nextPassword = typia.random<string & tags.Format<"password">>();
  const completionBody = {
    token: resetRequest.id,
    password: nextPassword,
  } satisfies ICommunityPlatformMemberPasswordReset.IUpdate;
  const completed =
    await api.functional.communityPlatform.admin.password_resets.updatePassword(
      adminConnection,
      {
        passwordResetId: resetRequest.id,
        body: completionBody,
      },
    );
  typia.assert(completed);
  TestValidator.equals("member id is preserved", completed.id, memberJoin.id);
  TestValidator.equals(
    "member code is preserved",
    completed.code,
    memberJoin.code,
  );
  TestValidator.equals(
    "member email is preserved",
    completed.email,
    memberJoin.email,
  );
  TestValidator.equals(
    "member email verification state is preserved",
    completed.emailVerified,
    memberJoin.emailVerified,
  );
  TestValidator.equals(
    "member status is preserved",
    completed.status,
    memberJoin.status,
  );
  TestValidator.equals(
    "member creation timestamp is preserved",
    completed.createdAt,
    memberJoin.createdAt,
  );
  TestValidator.equals(
    "member deletion timestamp is preserved",
    completed.deletedAt,
    memberJoin.deletedAt,
  );
  TestValidator.equals(
    "member profile ownership and content remain intact",
    completed.profile,
    memberJoin.profile,
  );
  TestValidator.notEquals(
    "member updated timestamp changes after password reset",
    completed.updatedAt,
    memberJoin.updatedAt,
  );
  await TestValidator.error(
    "password reset request cannot be reused",
    async () => {
      await api.functional.communityPlatform.admin.password_resets.updatePassword(
        adminConnection,
        {
          passwordResetId: resetRequest.id,
          body: completionBody,
        },
      );
    },
  );
  const memberLoginWithNewPasswordConnection: api.IConnection = {
    host: connection.host,
  };
  const relogin = await authorize_member_login(
    memberLoginWithNewPasswordConnection,
    {
      body: {
        email: memberJoin.email,
        password: nextPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(relogin);
  TestValidator.equals(
    "login with new password preserves member id",
    relogin.id,
    memberJoin.id,
  );
  TestValidator.equals(
    "login with new password preserves member code",
    relogin.code,
    memberJoin.code,
  );
  TestValidator.equals(
    "login with new password preserves member email",
    relogin.email,
    memberJoin.email,
  );
  const memberLoginWithOldPasswordConnection: api.IConnection = {
    host: connection.host,
  };
  await TestValidator.error(
    "old password is no longer valid after reset",
    async () => {
      await authorize_member_login(memberLoginWithOldPasswordConnection, {
        body: {
          email: memberJoin.email,
          password: originalPassword,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        },
      });
    },
  );
}
