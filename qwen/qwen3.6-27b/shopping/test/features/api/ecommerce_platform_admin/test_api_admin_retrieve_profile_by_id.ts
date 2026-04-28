import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_retrieve_profile_by_id(
  connection: api.IConnection,
) {
  // 1. Register an administrator to create a retrievable record.
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const authorizedAdmin = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      password: RandomGenerator.alphaNumeric(12),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformAdmin.IJoin,
  });
  // 2. Retrieve the admin profile using the ID from the registration step.
  const adminRetrieveConnection: api.IConnection = { host: connection.host };
  const retrievedAdmin = await api.functional.ecommercePlatform.admins.at(
    adminRetrieveConnection,
    {
      adminId: authorizedAdmin.id,
    },
  );
  typia.assert(retrievedAdmin);
  // 3. Validate that the retrieved admin ID matches the registered admin ID.
  TestValidator.equals(
    "retrieved admin ID matches joined admin ID",
    retrievedAdmin.id,
    authorizedAdmin.id,
  );
}
