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

export async function test_api_admin_job_queue_pagination_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // Prepare date range filters
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  // Test various filter combinations
  const filterCombinations = [
    // Basic pagination
    { page: 1, limit: 10 },
    // Status filter
    { status: "pending" },
    { status: "processing" },
    { status: "completed" },
    { status: "failed" },
    { status: "cancelled" },
    // Job name filter with partial match
    { jobName: "email" },
    { jobName: "notification" },
    // Retry count thresholds
    { minRetryCount: 0 },
    { maxRetryCount: 2 },
    { minRetryCount: 1, maxRetryCount: 3 },
    // Date range filters
    { createdAfter: oneHourAgo.toISOString() },
    { createdBefore: oneHourLater.toISOString() },
    {
      createdAfter: oneHourAgo.toISOString(),
      createdBefore: oneHourLater.toISOString(),
    },
    { startedAfter: oneHourAgo.toISOString() },
    { startedBefore: oneHourLater.toISOString() },
    // Sort combinations
    { sort: "created_at", order: "asc" },
    { sort: "created_at", order: "desc" },
    { sort: "priority", order: "asc" },
    { sort: "priority", order: "desc" },
    { sort: "retry_count", order: "asc" },
    { sort: "retry_count", order: "desc" },
    // Include deleted
    { includeDeleted: false },
    { includeDeleted: true },
    // Complex combinations
    { status: "pending", page: 1, limit: 5 },
    {
      status: "failed",
      minRetryCount: 1,
      maxRetryCount: 5,
      sort: "retry_count",
      order: "desc",
    },
    {
      jobName: "order",
      createdAfter: oneHourAgo.toISOString(),
      sort: "created_at",
      order: "desc",
    },
  ];
  for (const filters of filterCombinations) {
    const result = await api.functional.ecommerceMall.admin.job_queues.index(
      adminConnection,
      {
        body: filters as IEcommerceMallJobQueue.IRequest,
      },
    );
    typia.assert(result);
    // Validate pagination structure
    TestValidator.equals("pagination exists", result.pagination, {
      current: filters.page ?? 1,
      limit: filters.limit ?? 10,
      records: typia.assert<number>(result.pagination.records),
      pages: typia.assert<number>(result.pagination.pages),
    });
    // Validate data array exists and has correct structure
    TestValidator.predicate("data array exists", Array.isArray(result.data));
    for (const job of result.data) {
      typia.assert<IEcommerceMallJobQueue.ISummary>(job);
    }
    // If filters include status, verify all returned jobs match
    if (filters.status) {
      const allMatchStatus = result.data.every(
        (job) => job.status === filters.status,
      );
      TestValidator.predicate("all jobs match status filter", allMatchStatus);
    }
    // If filters include jobName, verify all returned jobs match (partial match)
    if (filters.jobName) {
      const jobNameLower = filters.jobName.toLowerCase();
      const allMatchName = result.data.every((job) =>
        job.job_name.toLowerCase().includes(jobNameLower),
      );
      TestValidator.predicate("all jobs match jobName filter", allMatchName);
    }
    // If filters include retry count thresholds, verify all returned jobs match
    if (filters.minRetryCount !== undefined) {
      const allMinRetry = result.data.every(
        (job) => job.retry_count >= filters.minRetryCount,
      );
      TestValidator.predicate("all jobs satisfy minRetryCount", allMinRetry);
    }
    if (filters.maxRetryCount !== undefined) {
      const allMaxRetry = result.data.every(
        (job) => job.retry_count <= filters.maxRetryCount,
      );
      TestValidator.predicate("all jobs satisfy maxRetryCount", allMaxRetry);
    }
    // If filters include created date range, verify all returned jobs match
    if (filters.createdAfter !== undefined) {
      const afterDate = new Date(filters.createdAfter).getTime();
      const allCreatedAfter = result.data.every(
        (job) => new Date(job.created_at).getTime() >= afterDate,
      );
      TestValidator.predicate(
        "all jobs satisfy createdAfter filter",
        allCreatedAfter,
      );
    }
    if (filters.createdBefore !== undefined) {
      const beforeDate = new Date(filters.createdBefore).getTime();
      const allCreatedBefore = result.data.every(
        (job) => new Date(job.created_at).getTime() <= beforeDate,
      );
      TestValidator.predicate(
        "all jobs satisfy createdBefore filter",
        allCreatedBefore,
      );
    }
  }
}
