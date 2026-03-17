import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_platform_admin_password_resets_create } from "../../../generate/generate_random_community_platform_admin_password_resets_create";
import { prepare_random_community_platform_member_password_reset } from "../../../prepare/prepare_random_community_platform_member_password_reset";

export async function test_api_password_reset_delete_other_account_forbidden(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerJoin = await authorize_admin_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(ownerJoin);
  const otherConnection: api.IConnection = { host: connection.host };
  const otherJoin = await authorize_admin_join(otherConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(otherJoin);
  TestValidator.notEquals(
    "different administrators are created",
    ownerJoin.id,
    otherJoin.id,
  );
  const passwordReset =
    await generate_random_community_platform_admin_password_resets_create(
      ownerConnection,
      {},
    );
  typia.assert(passwordReset);
  const snapshot = {
    id: passwordReset.id,
    memberId: passwordReset.member.id,
    memberEmail: passwordReset.member.email,
    href: passwordReset.href,
    referrer: passwordReset.referrer,
    ip: passwordReset.ip,
    expiredAt: passwordReset.expired_at,
    usedAt: passwordReset.used_at,
    revokedAt: passwordReset.revoked_at,
    deletedAt: passwordReset.deleted_at,
  };
  await TestValidator.error(
    "other admin cannot delete owner's password reset",
    async () => {
      await api.functional.communityPlatform.admin.password_resets.erase(
        otherConnection,
        {
          passwordResetId: passwordReset.id,
        },
      );
    },
  );
  TestValidator.equals(
    "password reset id unchanged",
    passwordReset.id,
    snapshot.id,
  );
  TestValidator.equals(
    "password reset member id unchanged",
    passwordReset.member.id,
    snapshot.memberId,
  );
  TestValidator.equals(
    "password reset member email unchanged",
    passwordReset.member.email,
    snapshot.memberEmail,
  );
  TestValidator.equals(
    "password reset href unchanged",
    passwordReset.href,
    snapshot.href,
  );
  TestValidator.equals(
    "password reset referrer unchanged",
    passwordReset.referrer,
    snapshot.referrer,
  );
  TestValidator.equals(
    "password reset ip unchanged",
    passwordReset.ip,
    snapshot.ip,
  );
  TestValidator.equals(
    "password reset expiration unchanged",
    passwordReset.expired_at,
    snapshot.expiredAt,
  );
  TestValidator.equals(
    "password reset used_at unchanged",
    passwordReset.used_at,
    snapshot.usedAt,
  );
  TestValidator.equals(
    "password reset revoked_at unchanged",
    passwordReset.revoked_at,
    snapshot.revokedAt,
  );
  TestValidator.equals(
    "password reset deleted_at unchanged",
    passwordReset.deleted_at,
    snapshot.deletedAt,
  );
  TestValidator.predicate(
    "owner connection remains authorized",
    typeof ownerConnection.headers?.Authorization === "string" &&
      ownerConnection.headers.Authorization.length > 0,
  );
  TestValidator.predicate(
    "other connection remains authorized",
    typeof otherConnection.headers?.Authorization === "string" &&
      otherConnection.headers.Authorization.length > 0,
  );
  TestValidator.notEquals(
    "separate admin sessions remain isolated",
    ownerConnection.headers?.Authorization,
    otherConnection.headers?.Authorization,
  );
}
