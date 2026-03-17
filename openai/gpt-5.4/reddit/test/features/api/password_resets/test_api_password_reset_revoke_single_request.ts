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

export async function test_api_password_reset_revoke_single_request(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) satisfies string as string &
      tags.Format<"password">,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformAdmin.IJoin;
  const admin = await authorize_admin_join(adminConnection, {
    body: adminJoinBody,
  });
  typia.assert(admin);
  TestValidator.equals(
    "authorized admin email matches join input",
    admin.email,
    adminJoinBody.email,
  );
  const targetReset =
    await generate_random_community_platform_admin_password_resets_create(
      adminConnection,
      {},
    );
  typia.assert(targetReset);
  const unaffectedReset =
    await generate_random_community_platform_admin_password_resets_create(
      adminConnection,
      {
        body: {
          email: targetReset.member.email,
        },
      },
    );
  typia.assert(unaffectedReset);
  TestValidator.equals(
    "same member id across reset requests",
    unaffectedReset.member.id,
    targetReset.member.id,
  );
  TestValidator.equals(
    "same member email across reset requests",
    unaffectedReset.member.email,
    targetReset.member.email,
  );
  TestValidator.notEquals(
    "different reset request ids",
    targetReset.id,
    unaffectedReset.id,
  );
  await api.functional.communityPlatform.admin.password_resets.erase(
    adminConnection,
    {
      passwordResetId: targetReset.id,
    },
  );
  TestValidator.equals(
    "member id unchanged after deleting one reset",
    unaffectedReset.member.id,
    targetReset.member.id,
  );
  TestValidator.equals(
    "member code unchanged after deleting one reset",
    unaffectedReset.member.code,
    targetReset.member.code,
  );
  TestValidator.equals(
    "member email unchanged after deleting one reset",
    unaffectedReset.member.email,
    targetReset.member.email,
  );
  TestValidator.equals(
    "member deleted_at unchanged after deleting one reset",
    unaffectedReset.member.deleted_at,
    targetReset.member.deleted_at,
  );
  TestValidator.equals(
    "other reset still belongs to same member",
    unaffectedReset.member.id,
    targetReset.member.id,
  );
  TestValidator.notEquals(
    "deleted target differs from unaffected reset",
    targetReset.id,
    unaffectedReset.id,
  );
}
