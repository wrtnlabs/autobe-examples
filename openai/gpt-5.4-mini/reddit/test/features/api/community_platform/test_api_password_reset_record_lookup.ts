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

export async function test_api_password_reset_record_lookup(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12) satisfies string as string,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const output =
    await api.functional.communityPlatform.admin.password_resets.at(
      adminConnection,
      {
        resetId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
  TestValidator.equals("record id exists", output.id, output.id);
  TestValidator.equals(
    "linked member id exists",
    output.community_platform_member_id,
    output.community_platform_member_id,
  );
  TestValidator.equals("token exists", output.token, output.token);
  TestValidator.equals(
    "created_at exists",
    output.created_at,
    output.created_at,
  );
  TestValidator.equals(
    "expired_at exists",
    output.expired_at,
    output.expired_at,
  );
  TestValidator.equals("used_at exists", output.used_at, output.used_at);
  TestValidator.equals(
    "revoked_at exists",
    output.revoked_at,
    output.revoked_at,
  );
}
