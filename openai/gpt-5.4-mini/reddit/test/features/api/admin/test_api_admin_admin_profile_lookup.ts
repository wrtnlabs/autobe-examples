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

export async function test_api_admin_admin_profile_lookup(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const targetConnection: api.IConnection = { host: connection.host };
  const caller = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(caller);
  const target = await authorize_admin_join(targetConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(target);
  const lookedUp = await api.functional.communityPlatform.admin.admins.at(
    adminConnection,
    {
      adminId: target.id,
    },
  );
  typia.assert(lookedUp);
  const lookedUpAgain = await api.functional.communityPlatform.admin.admins.at(
    adminConnection,
    {
      adminId: target.id,
    },
  );
  typia.assert(lookedUpAgain);
  TestValidator.equals("looked up admin id", lookedUp.id, target.id);
  TestValidator.equals("looked up admin email", lookedUp.email, target.email);
  TestValidator.equals(
    "looked up admin created_at",
    lookedUp.created_at,
    target.created_at,
  );
  TestValidator.equals(
    "looked up admin updated_at",
    lookedUp.updated_at,
    target.updated_at,
  );
  TestValidator.equals(
    "looked up admin deleted_at",
    lookedUp.deleted_at,
    target.deleted_at,
  );
  TestValidator.equals(
    "lookup should be stable and read-only",
    lookedUpAgain,
    lookedUp,
  );
  TestValidator.notEquals(
    "lookup should return target admin, not caller",
    lookedUp.id,
    caller.id,
  );
}
