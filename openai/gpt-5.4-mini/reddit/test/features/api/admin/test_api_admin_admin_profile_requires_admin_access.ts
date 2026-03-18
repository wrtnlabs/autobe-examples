import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_admin_profile_requires_admin_access(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const created = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(created);
  const profile = await api.functional.communityPlatform.admin.admins.at(
    adminConnection,
    {
      adminId: created.id,
    },
  );
  typia.assert(profile);
  TestValidator.equals("admin id matches requested id", profile.id, created.id);
  TestValidator.equals(
    "admin email matches authorized account",
    profile.email,
    created.email,
  );
  TestValidator.equals(
    "admin created_at matches authorized account",
    profile.created_at,
    created.created_at,
  );
  TestValidator.equals(
    "admin updated_at matches authorized account",
    profile.updated_at,
    created.updated_at,
  );
  TestValidator.equals(
    "admin deleted_at matches authorized account",
    profile.deleted_at,
    created.deleted_at,
  );
}
