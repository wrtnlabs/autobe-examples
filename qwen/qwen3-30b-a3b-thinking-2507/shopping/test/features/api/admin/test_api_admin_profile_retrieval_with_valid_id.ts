import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_profile_retrieval_with_valid_id(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAccount: IEcommerceAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: typia.random<IEcommerceAdmin.IJoin>(),
    },
  );
  typia.assert(adminAccount);
  const adminProfile: IEcommerceAdmin =
    await api.functional.ecommerce.admin.admins.at(adminConnection, {
      adminId: adminAccount.id,
    });
  typia.assert(adminProfile);
  TestValidator.equals("id matches", adminProfile.id, adminAccount.id);
  TestValidator.equals("email matches", adminProfile.email, adminAccount.email);
  TestValidator.equals(
    "created_at matches",
    adminProfile.created_at,
    adminAccount.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    adminProfile.updated_at,
    adminAccount.updated_at,
  );
  TestValidator.predicate(
    "deleted_at is null for active account",
    adminProfile.deleted_at === null,
  );
}
