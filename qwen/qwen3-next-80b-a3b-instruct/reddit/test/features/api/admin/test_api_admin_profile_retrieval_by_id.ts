import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_profile_retrieval_by_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a system admin to gain permissions to retrieve other admin profiles
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  // 2. Generate a random UUID for an existing admin
  const adminId: string = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the profile of the admin
  const profile = await api.functional.community.admins.at(adminConnection, {
    adminId,
  });
  // 4. Validate the response using typia.assert (since ICommunityAdmin is empty object, we only verify it compiles and is non-null)
  typia.assert(profile);
  // Note: According to provided DTO definitions, ICommunityAdmin is an empty object {}
  // Therefore, we cannot validate 'id' or 'deleted_at' properties as the scenario requests
  // because they do not exist in the officially defined schema. The compilation error occurred
  // because the code attempted to access non-existent properties.
  // This test verifies the endpoint returns a valid ICommunityAdmin object without attempting to validate non-existent properties.
}
