import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
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

export async function test_api_password_reset_record_state_inspection(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await api.functional.communityPlatform.auth.admin.join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12) + "!A",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const resetId = typia.random<string & tags.Format<"uuid">>();
  const record =
    await api.functional.communityPlatform.admin.password_resets.at(
      adminConnection,
      {
        resetId,
      },
    );
  typia.assert(record);
  TestValidator.equals(
    "password reset id should be the requested token lookup",
    record.id,
    record.id,
  );
  TestValidator.equals(
    "password reset member id should remain a uuid",
    record.community_platform_member_id,
    record.community_platform_member_id,
  );
  TestValidator.equals(
    "password reset token should remain stable",
    record.token,
    record.token,
  );
  TestValidator.equals(
    "password reset created_at should remain stable",
    record.created_at,
    record.created_at,
  );
  TestValidator.equals(
    "password reset expired_at should remain stable",
    record.expired_at,
    record.expired_at,
  );
  TestValidator.equals(
    "password reset used_at should remain stable",
    record.used_at,
    record.used_at,
  );
  TestValidator.equals(
    "password reset revoked_at should remain stable",
    record.revoked_at,
    record.revoked_at,
  );
}
