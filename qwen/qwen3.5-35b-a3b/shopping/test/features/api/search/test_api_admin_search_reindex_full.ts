import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSearchIndicesReindexJob } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSearchIndicesReindexJob";
import type { IEcommerceMallSearchIndicesReindexRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSearchIndicesReindexRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_search_reindex_full(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestAdmin123!",
      href: "https://admin.example.com/join",
      referrer: "https://admin.example.com/",
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Trigger full platform reindex (no entityTypes specified, defaults to 'all')
  const job: IEcommerceMallSearchIndicesReindexJob =
    await api.functional.ecommerceMall.admin.search.reindex(adminConnection, {
      body: {} satisfies IEcommerceMallSearchIndicesReindexRequest,
    });
  typia.assert(job);
  // 3. Validate entityTypes defaults to ['all']
  TestValidator.equals("entityTypes defaults to all", job.entityTypes, ["all"]);
  // 4. Validate status is 'queued'
  TestValidator.equals("job status is queued", job.status, "queued");
  // 5. Validate totalEntityCount is non-zero
  TestValidator.predicate(
    "totalEntityCount is positive",
    job.totalEntityCount > 0,
  );
  // 6. Validate estimatedCompletionTime is provided as ISO 8601 duration
  TestValidator.predicate(
    "estimatedCompletionTime is provided",
    job.estimatedCompletionTime !== null,
  );
}
