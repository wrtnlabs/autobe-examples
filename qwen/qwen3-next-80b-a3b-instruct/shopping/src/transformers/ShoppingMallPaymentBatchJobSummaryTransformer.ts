import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallPaymentBatchJobSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentBatchJobSummary";
import { IShoppingMallPaymentBatchJobErrorCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentBatchJobErrorCategories";
import { IShoppingMallPaymentBatchJobTypeSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentBatchJobTypeSummary";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallPaymentBatchJobSummaryTransformer {
  export type Payload = Prisma.shopping_mall_payment_batch_job_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        job_type: true,
        status: true,
        job_duration_ms: true,
        error_message: true,
        metadata: true,
        created_at: true,
      },
    } satisfies Prisma.shopping_mall_payment_batch_job_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallPaymentBatchJobSummary> {
    // Convert single input to array
    const inputArray: Payload[] = [input];
    // Compute aggregated metrics from the query results
    const total_jobs = inputArray.length;
    const successful_jobs = inputArray.filter(
      (job) => job.status === "success",
    ).length;
    const failed_jobs = inputArray.filter(
      (job) => job.status === "failed",
    ).length;
    const jobDurations = inputArray.map((job) => job.job_duration_ms);
    const avg_processing_duration_ms =
      jobDurations.length > 0
        ? jobDurations.reduce((sum, dur) => sum + dur, 0) / jobDurations.length
        : 0;
    const max_processing_duration_ms =
      jobDurations.length > 0 ? Math.max(...jobDurations) : 0;
    const min_processing_duration_ms =
      jobDurations.length > 0 ? Math.min(...jobDurations) : 0;
    // Calculate avg_retry_count from metadata (assuming metadata contains retry count)
    const avg_retry_count =
      inputArray.length > 0
        ? inputArray.reduce(
            (sum, job) =>
              sum +
              (typeof job.metadata === "string"
                ? JSON.parse(job.metadata).retry_count || 0
                : job.metadata?.retry_count || 0),
            0,
          ) / inputArray.length
        : 0;
    const distinct_job_types = new Set(inputArray.map((job) => job.job_type))
      .size;
    // Build error_categories from error_message
    const error_categories: IShoppingMallPaymentBatchJobErrorCategories = {};
    inputArray
      .filter((job) => job.error_message !== null)
      .forEach((job) => {
        if (job.error_message) {
          // Simple categorization based on error message patterns
          let category = "unknown";
          if (job.error_message.includes("timeout"))
            category = "connection_timeout";
          else if (job.error_message.includes("validation"))
            category = "validation_failure";
          else if (job.error_message.includes("rejected"))
            category = "gateway_rejection";
          else if (job.error_message.includes("deadlock"))
            category = "database_deadlock";
          else if (job.error_message.includes("rate limit"))
            category = "rate_limit_exceeded";
          // Fix: Cast to any to allow string indexing on interface
          (error_categories as any)[category] =
            ((error_categories as any)[category] || 0) + 1;
        }
      });
    // Build job_type_summary
    // Change to Record type to allow dynamic string keys
    const jobTypeSummary: Record<
      string,
      {
        total: number;
        successful: number;
        failed: number;
        avg_duration: number;
        avg_retry: number;
      }
    > = {};
    const jobTypes = [...new Set(inputArray.map((job) => job.job_type))];
    jobTypes.forEach((jobType) => {
      const jobsOfType = inputArray.filter((job) => job.job_type === jobType);
      const total = jobsOfType.length;
      const successful = jobsOfType.filter(
        (job) => job.status === "success",
      ).length;
      const failed = jobsOfType.filter((job) => job.status === "failed").length;
      const durations = jobsOfType.map((job) => job.job_duration_ms);
      const avg_duration =
        durations.length > 0
          ? durations.reduce((sum, dur) => sum + dur, 0) / durations.length
          : 0;
      const avg_retry =
        durations.length > 0
          ? jobsOfType.reduce(
              (sum, job) =>
                sum +
                (typeof job.metadata === "string"
                  ? JSON.parse(job.metadata).retry_count || 0
                  : job.metadata?.retry_count || 0),
              0,
            ) / durations.length
          : 0;
      // Use Record type assignment
      jobTypeSummary[jobType] = {
        total,
        successful,
        failed,
        avg_duration,
        avg_retry,
      };
    });
    // Extract last_execution_time - use toISOStringSafe
    const last_execution_time =
      inputArray.length > 0
        ? toISOStringSafe(
            new Date(
              Math.max(...inputArray.map((job) => job.created_at.getTime())),
            ),
          )
        : toISOStringSafe(new Date());
    // Extract monitoring_alerts from metadata
    const monitoring_alerts: string[] = [];
    inputArray.forEach((job) => {
      if (job.metadata) {
        try {
          const metaObj =
            typeof job.metadata === "string"
              ? JSON.parse(job.metadata)
              : job.metadata;
          if (metaObj.alerts && Array.isArray(metaObj.alerts)) {
            monitoring_alerts.push(...metaObj.alerts);
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
    });
    // Compute reconciliation_discrepancies
    const reconciliation_discrepancies = inputArray.filter(
      (job) =>
        job.metadata &&
        (typeof job.metadata === "string"
          ? JSON.parse(job.metadata)
          : job.metadata
        )?.reconciliation_discrepancy === true,
    ).length;
    // Compute total_data_records_processed
    const total_data_records_processed = inputArray.reduce(
      (sum, job) =>
        sum +
        (job.metadata && typeof job.metadata === "object"
          ? (job.metadata as any).data_records_processed || 0
          : 0),
      0,
    );
    // Compute total_data_volume_bytes
    const total_data_volume_bytes = inputArray.reduce(
      (sum, job) =>
        sum +
        (job.metadata && typeof job.metadata === "object"
          ? (job.metadata as any).data_volume_bytes || 0
          : 0),
      0,
    );
    // Compute total_data_exported_bytes
    const total_data_exported_bytes = inputArray.reduce(
      (sum, job) =>
        sum +
        (job.metadata && typeof job.metadata === "object"
          ? (job.metadata as any).data_exported_bytes || 0
          : 0),
      0,
    );
    // Convert jobTypeSummary to IShoppingMallPaymentBatchJobTypeSummary
    const finalJobTypeSummary: IShoppingMallPaymentBatchJobTypeSummary =
      jobTypeSummary as IShoppingMallPaymentBatchJobTypeSummary;
    return {
      total_jobs,
      successful_jobs,
      failed_jobs,
      avg_processing_duration_ms,
      max_processing_duration_ms,
      min_processing_duration_ms,
      avg_retry_count,
      distinct_job_types,
      error_categories,
      job_type_summary: finalJobTypeSummary,
      last_execution_time,
      monitoring_alerts,
      reconciliation_discrepancies,
      total_data_records_processed,
      total_data_volume_bytes,
      total_data_exported_bytes,
    };
  }
}
