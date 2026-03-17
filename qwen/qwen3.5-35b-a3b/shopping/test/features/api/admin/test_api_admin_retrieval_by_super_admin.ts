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

export async function test_api_admin_retrieval_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create target administrator account (victim admin)
  const victimConnection: api.IConnection = { host: connection.host };
  const victimAdmin: IEcommerceMallAdmin.IAuthorized =
    await authorize_admin_join(victimConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallAdmin.IJoin,
    });
  typia.assert(victimAdmin);
  // 2. Create super administrator account (retrieving admin)
  const superConnection: api.IConnection = { host: connection.host };
  const superAdmin: IEcommerceMallAdmin.IAuthorized =
    await authorize_admin_join(superConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallAdmin.IJoin,
    });
  typia.assert(superAdmin);
  // 3. Super admin retrieves victim admin details
  const retrievedAdmin: IEcommerceMallAdmin =
    await api.functional.ecommerceMall.admin.admins.at(superConnection, {
      adminId: victimAdmin.id,
    });
  typia.assert(retrievedAdmin);
  // 4. Validate response structure
  TestValidator.equals("admin ID matches", retrievedAdmin.id, victimAdmin.id);
  TestValidator.equals(
    "admin email matches",
    retrievedAdmin.email,
    victimAdmin.email,
  );
  TestValidator.predicate(
    "status is valid",
    ["active", "suspended", "banned"].includes(retrievedAdmin.status),
  );
  TestValidator.equals(
    "created_at format is valid",
    true,
    !isNaN(Date.parse(retrievedAdmin.created_at)),
  );
  TestValidator.equals(
    "updated_at format is valid",
    true,
    !isNaN(Date.parse(retrievedAdmin.updated_at)),
  );
  TestValidator.equals(
    "deleted_at is null for active account",
    retrievedAdmin.deleted_at,
    null,
  );
}
