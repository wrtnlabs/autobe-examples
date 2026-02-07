import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityPlatformMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMetadatum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_platform_health_unhealthy_failed(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin to access the health endpoint
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  // 2. Query the health endpoint
  const healthResponse =
    await api.functional.community.admin.dashboard.health.at(adminConnection);
  typia.assert(healthResponse);
  // 3. Validate response conforms to provided ICommunityPlatformMetadatum DTO (empty object)
  // Since the schema defines ICommunityPlatformMetadatum as {} (empty object),
  // we can ONLY validate it is an empty object.
  // The scenario requirement to validate status='unhealthy', version='', uptime=0
  // cannot be implemented because these properties do not exist in the provided DTO.
  // We satisfy the compiler and the practical requirement (request succeeds) by
  // confirming the returned object is empty as per the schema definition.
  TestValidator.predicate("response is non-null", healthResponse !== null);
  TestValidator.predicate(
    "response is object",
    typeof healthResponse === "object",
  );
  TestValidator.predicate(
    "response is empty object",
    Object.keys(healthResponse).length === 0,
  );
}
