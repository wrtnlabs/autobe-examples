import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallJobQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallJobQueue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_job_queue_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Generate a job queue record for testing
  const newJob = typia.random<IEcommerceMallJobQueue>();
  typia.assert(newJob);
  // 3. Retrieve specific job queue
  const retrievedJob = await api.functional.ecommerceMall.admin.job_queues.at(
    adminConnection,
    {
      jobQueueId: newJob.id,
    },
  );
  typia.assert(retrievedJob);
  // 4. Validate retrieved job matches original
  TestValidator.equals("job queue ID matches", retrievedJob.id, newJob.id);
  TestValidator.equals(
    "job queue name matches",
    retrievedJob.job_name,
    newJob.job_name,
  );
  TestValidator.equals(
    "job queue status matches",
    retrievedJob.status,
    newJob.status,
  );
  TestValidator.equals(
    "job queue priority matches",
    retrievedJob.priority,
    newJob.priority,
  );
  // 5. Test retrieval of non-existent job queue
  await TestValidator.error("non-existent job queue returns null", async () => {
    await api.functional.ecommerceMall.admin.job_queues.at(adminConnection, {
      jobQueueId: typia.random<string & tags.Format<"uuid">>(),
    });
  });
}
