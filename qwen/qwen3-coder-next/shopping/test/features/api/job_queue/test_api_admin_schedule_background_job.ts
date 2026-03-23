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
import { generate_random_ecommerce_mall_admin_job_queues_create } from "../../../generate/generate_random_ecommerce_mall_admin_job_queues_create";
import { prepare_random_ecommerce_mall_job_queue } from "../../../prepare/prepare_random_ecommerce_mall_job_queue";

export async function test_api_admin_schedule_background_job(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Generate job parameters
  const jobName = RandomGenerator.name(2);
  const priority = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<100>
  >() satisfies number as number;
  const maxRetries = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<5>
  >() satisfies number as number;
  // 3. Create background job
  const job = await api.functional.ecommerceMall.admin.job_queues.create(
    adminConnection,
    {
      body: {
        job_name: jobName,
        priority,
        max_retries: maxRetries,
      } satisfies IEcommerceMallJobQueue.ICreate,
    },
  );
  typia.assert(job);
  // 4. Validate response
  TestValidator.equals("job_name matches", job.job_name, jobName);
  TestValidator.equals("priority matches", job.priority, priority);
  TestValidator.equals("max_retries matches", job.max_retries, maxRetries);
  TestValidator.equals("status is pending", job.status, "pending");
  TestValidator.equals("retry_count is 0", job.retry_count, 0);
  TestValidator.predicate("has valid id", /^[0-9a-f-]{36}$/i.test(job.id));
  TestValidator.predicate(
    "has created_at",
    typeof job.created_at === "string" && !isNaN(Date.parse(job.created_at)),
  );
  TestValidator.predicate(
    "has updated_at",
    typeof job.updated_at === "string" && !isNaN(Date.parse(job.updated_at)),
  );
}