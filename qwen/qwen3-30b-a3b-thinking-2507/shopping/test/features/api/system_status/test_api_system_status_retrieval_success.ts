import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceSystemStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSystemStatus";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_ecommerce_admin_system_statuses_create } from "../../../generate/generate_random_ecommerce_admin_system_statuses_create";
import { prepare_random_ecommerce_system_status } from "../../../prepare/prepare_random_ecommerce_system_status";

export async function test_api_system_status_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication via join operation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
    },
  });
  // 2. Create system status record
  const statusResponse =
    await generate_random_ecommerce_admin_system_statuses_create(
      adminConnection,
      {},
    );
  // 3. Retrieve created system status record
  // Cast to IEntity to access id (since IEcommerceSystemStatus is incorrectly defined as empty object)
  const statusWithId = statusResponse as unknown as IEntity;
  const retrievedStatus =
    await api.functional.ecommerce.admin.system_statuses.at(adminConnection, {
      id: statusWithId.id,
    });
  // 4. Validate system status
  typia.assert(retrievedStatus);
  TestValidator.equals("Status should match", statusResponse, retrievedStatus);
}
