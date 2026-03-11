import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallJobQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallJobQueue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallJobQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallJobQueue";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_monitor_job_execution_progress(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create admin user
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 1. Filter jobs by status 'processing'
  const processingJobs =
    await api.functional.ecommerceMall.admin.job_queues.index(adminConnection, {
      body: {
        status: "processing",
      } satisfies IEcommerceMallJobQueue.IRequest,
    });
  typia.assert(processingJobs);
  // 2. Date range filter on started_at
  const now = new Date().toISOString();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const recentJobs = await api.functional.ecommerceMall.admin.job_queues.index(
    adminConnection,
    {
      body: {
        startedAfter: oneHourAgo,
        startedBefore: now,
      } satisfies IEcommerceMallJobQueue.IRequest,
    },
  );
  typia.assert(recentJobs);
  // 3. Combined filter: processing jobs with null finished_at
  const activeJobs = await api.functional.ecommerceMall.admin.job_queues.index(
    adminConnection,
    {
      body: {
        status: "processing",
        createdAfter: oneHourAgo,
      } satisfies IEcommerceMallJobQueue.IRequest,
    },
  );
  typia.assert(activeJobs);
  // 4. Test pagination
  const paginatedJobs =
    await api.functional.ecommerceMall.admin.job_queues.index(adminConnection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallJobQueue.IRequest,
    });
  typia.assert(paginatedJobs);
  TestValidator.predicate(
    "has pagination info",
    paginatedJobs.pagination.current >= 0,
  );
  TestValidator.predicate("has data array", Array.isArray(paginatedJobs.data));
  // 5. Test sorting by priority
  const sortedJobs = await api.functional.ecommerceMall.admin.job_queues.index(
    adminConnection,
    {
      body: {
        sort: "priority",
        order: "desc",
      } satisfies IEcommerceMallJobQueue.IRequest,
    },
  );
  typia.assert(sortedJobs);
  // 6. Validate essential summary fields
  if (sortedJobs.data.length > 0) {
    const job = sortedJobs.data[0];
    typia.assert<IEcommerceMallJobQueue.ISummary>(job);
    TestValidator.predicate("has id", typeof job.id === "string");
    TestValidator.predicate("has job_name", typeof job.job_name === "string");
    TestValidator.predicate("has status", typeof job.status === "string");
    TestValidator.predicate(
      "has retry_count",
      typeof job.retry_count === "number",
    );
    TestValidator.predicate(
      "has created_at",
      typeof job.created_at === "string",
    );
  }
}
