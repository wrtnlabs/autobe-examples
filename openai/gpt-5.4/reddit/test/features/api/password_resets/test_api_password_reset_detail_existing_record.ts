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

export async function test_api_password_reset_detail_existing_record(
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
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const created =
    await generate_random_community_platform_admin_password_resets_create(
      adminConnection,
      {},
    );
  typia.assert(created);
  const detail =
    await api.functional.communityPlatform.admin.password_resets.at(
      adminConnection,
      {
        passwordResetId: created.id,
      },
    );
  typia.assert(detail);
  TestValidator.equals(
    "detail id matches created record",
    detail.id,
    created.id,
  );
  TestValidator.equals(
    "detail member matches created record",
    detail.member,
    created.member,
  );
  TestValidator.equals(
    "detail ip matches created record",
    detail.ip,
    created.ip,
  );
  TestValidator.equals(
    "detail href matches created record",
    detail.href,
    created.href,
  );
  TestValidator.equals(
    "detail referrer matches created record",
    detail.referrer,
    created.referrer,
  );
  TestValidator.equals(
    "detail expired_at matches created record",
    detail.expired_at,
    created.expired_at,
  );
  TestValidator.equals(
    "detail used_at matches created record",
    detail.used_at,
    created.used_at,
  );
  TestValidator.equals(
    "detail revoked_at matches created record",
    detail.revoked_at,
    created.revoked_at,
  );
  TestValidator.equals(
    "detail created_at matches created record",
    detail.created_at,
    created.created_at,
  );
  TestValidator.equals(
    "detail updated_at matches created record",
    detail.updated_at,
    created.updated_at,
  );
  TestValidator.equals(
    "detail deleted_at matches created record",
    detail.deleted_at,
    created.deleted_at,
  );
  TestValidator.equals(
    "member id matches",
    detail.member.id,
    created.member.id,
  );
  TestValidator.equals(
    "member code matches",
    detail.member.code,
    created.member.code,
  );
  TestValidator.equals(
    "member email matches",
    detail.member.email,
    created.member.email,
  );
  TestValidator.equals(
    "member email verification matches",
    detail.member.email_verified,
    created.member.email_verified,
  );
  TestValidator.equals(
    "member status matches",
    detail.member.status,
    created.member.status,
  );
  TestValidator.equals(
    "member last sign in matches",
    detail.member.last_signed_in_at,
    created.member.last_signed_in_at,
  );
  TestValidator.equals(
    "member created_at matches",
    detail.member.created_at,
    created.member.created_at,
  );
  TestValidator.equals(
    "member updated_at matches",
    detail.member.updated_at,
    created.member.updated_at,
  );
  TestValidator.equals(
    "member deleted_at matches",
    detail.member.deleted_at,
    created.member.deleted_at,
  );
  const detailAgain =
    await api.functional.communityPlatform.admin.password_resets.at(
      adminConnection,
      {
        passwordResetId: created.id,
      },
    );
  typia.assert(detailAgain);
  TestValidator.equals("repeat detail read is stable", detailAgain, detail);
}
