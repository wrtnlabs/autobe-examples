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

export async function test_api_admin_identify_problematic_jobs(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Filter jobs by status 'failed'
  const failedJobs = await api.functional.ecommerceMall.admin.job_queues.index(
    adminConnection,
    {
      body: {
        status: "failed",
      },
    },
  );
  typia.assert(failedJobs);
  if (failedJobs.data.length > 0) {
    // Verify failed jobs have last_error
    for (const job of failedJobs.data) {
      TestValidator.predicate(
        "failed job has last_error",
        () => job.last_error !== null && job.last_error !== undefined,
      );
    }
  }
  // 3. Filter jobs with retry_count >= threshold
  const highRetryJobs =
    await api.functional.ecommerceMall.admin.job_queues.index(adminConnection, {
      body: {
        minRetryCount: typia.random<number & tags.Type<"int32">>(),
      },
    });
  typia.assert(highRetryJobs);
  for (const job of highRetryJobs.data) {
    TestValidator.predicate(
      "high retry count",
      () => job.retry_count >= (highRetryJobs.data[0]?.retry_count ?? 0),
    );
  }
  // 4. Combine status and retry filters
  const problematicJobs =
    await api.functional.ecommerceMall.admin.job_queues.index(adminConnection, {
      body: {
        status: "failed",
        minRetryCount: 2,
      },
    });
  typia.assert(problematicJobs);
  for (const job of problematicJobs.data) {
    TestValidator.equals("job status is failed", job.status, "failed");
    TestValidator.predicate("retry count >= 2", () => job.retry_count >= 2);
  }
  // 5. Test sorting by retry_count descending
  const sortedJobs = await api.functional.ecommerceMall.admin.job_queues.index(
    adminConnection,
    {
      body: {
        status: "failed",
        sort: "retry_count",
        order: "desc",
      },
    },
  );
  typia.assert(sortedJobs);
  for (let i = 1; i < sortedJobs.data.length; i++) {
    TestValidator.predicate(
      "sorted by retry_count descending",
      () =>
        sortedJobs.data[i - 1].retry_count >= sortedJobs.data[i].retry_count,
    );
  }
  // 6. Test date range filters with started_at timestamps
  const startDate = new Date().toISOString();
  const pastDate = new Date(new Date().getTime() - 86400000).toISOString(); // 24 hours ago
  const dateFilteredJobs =
    await api.functional.ecommerceMall.admin.job_queues.index(adminConnection, {
      body: {
        startedAfter: pastDate,
        startedBefore: startDate,
      },
    });
  typia.assert(dateFilteredJobs);
}
