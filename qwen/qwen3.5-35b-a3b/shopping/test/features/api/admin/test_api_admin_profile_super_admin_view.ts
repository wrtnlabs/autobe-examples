import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_profile_super_admin_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create regular administrator account
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdminResponse = await authorize_admin_join(
    regularAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(regularAdminResponse);
  const regularAdminId: string & tags.Format<"uuid"> = regularAdminResponse.id;
  // 2. Create super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminResponse = await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(superAdminResponse);
  // 3. Super admin retrieves regular admin's profile
  const profile = await api.functional.ecommerceMall.admin.admins.at(
    superAdminConnection,
    {
      adminId: regularAdminId,
    },
  );
  typia.assert(profile);
  // 4. Validate profile data
  TestValidator.equals("regular admin ID matches", profile.id, regularAdminId);
  TestValidator.equals(
    "regular admin email matches",
    profile.email,
    regularAdminResponse.email,
  );
  TestValidator.equals("ban status is false", profile.isBanned, false);
  TestValidator.equals("ban reason is null", profile.banReason, null);
  TestValidator.notEquals(
    "has valid timestamps",
    profile.createdAt,
    profile.createdAt,
  );
  TestValidator.notEquals(
    "updated at after created",
    profile.updatedAt,
    profile.createdAt,
  );
}
