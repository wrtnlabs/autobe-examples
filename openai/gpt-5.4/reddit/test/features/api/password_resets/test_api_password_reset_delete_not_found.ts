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

export async function test_api_password_reset_delete_not_found(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  const existing =
    await generate_random_community_platform_admin_password_resets_create(
      adminConnection,
      {},
    );
  typia.assert(existing);
  const existingId = existing.id;
  const existingMemberId = existing.member.id;
  const existingMemberEmail = existing.member.email;
  const existingUsedAt = existing.used_at;
  const existingRevokedAt = existing.revoked_at;
  const existingDeletedAt = existing.deleted_at;
  TestValidator.equals("existing reset starts unused", existingUsedAt, null);
  TestValidator.equals(
    "existing reset starts unrevoked",
    existingRevokedAt,
    null,
  );
  TestValidator.equals(
    "existing reset starts undeleted",
    existingDeletedAt,
    null,
  );
  let nonExistentId = typia.random<string & tags.Format<"uuid">>();
  while (nonExistentId === existingId)
    nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "deleting a non-existent password reset fails",
    async () => {
      await api.functional.communityPlatform.admin.password_resets.erase(
        adminConnection,
        {
          passwordResetId: nonExistentId,
        },
      );
    },
  );
  TestValidator.equals(
    "reference reset id remains unchanged",
    existing.id,
    existingId,
  );
  TestValidator.equals(
    "reference reset member id remains unchanged",
    existing.member.id,
    existingMemberId,
  );
  TestValidator.equals(
    "reference reset member email remains unchanged",
    existing.member.email,
    existingMemberEmail,
  );
  TestValidator.equals(
    "reference reset remains unused after failed deletion",
    existing.used_at,
    existingUsedAt,
  );
  TestValidator.equals(
    "reference reset remains unrevoked after failed deletion",
    existing.revoked_at,
    existingRevokedAt,
  );
  TestValidator.equals(
    "reference reset remains undeleted after failed deletion",
    existing.deleted_at,
    existingDeletedAt,
  );
}
