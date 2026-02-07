import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityServiceStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityServiceStatus";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_admin_service_statuses_create } from "../../../generate/generate_random_community_admin_service_statuses_create";
import { prepare_random_community_service_status } from "../../../prepare/prepare_random_community_service_status";

export async function test_api_service_status_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  // 2. Create service status record using utility function (mandatory)
  const serviceStatus =
    await generate_random_community_admin_service_statuses_create(
      adminConnection,
      {
        body: {
          serviceName: RandomGenerator.name(),
          serviceDescription: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityServiceStatus.ICreate,
      },
    );
  typia.assert(serviceStatus);
}
