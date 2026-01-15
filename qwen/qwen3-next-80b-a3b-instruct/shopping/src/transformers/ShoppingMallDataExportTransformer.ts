import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallDataExport } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDataExport";
import { IShoppingMallDataExportFilters } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDataExportFilters";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallDataExportTransformer {
  export type Payload = Prisma.shopping_mall_data_exportsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        request_metadata: true,
        format: true,
        requested_fields: true,
        filters: true,
        status: true,
        delivery_method: true,
        email: true,
        file_path: true,
        download_url: true,
        encrypted: true,
        encryption_key_reference: true,
        encrypted_at: true,
        completed_at: true,
        failed_at: true,
        delivered_at: true,
        error_message: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        admin: true,
      },
    } satisfies Prisma.shopping_mall_data_exportsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallDataExport> {
    return {
      id: input.id,
      status: input.status as "pending" | "processing" | "completed" | "failed",
      format:
        input.format !== undefined
          ? (input.format satisfies string as "csv" | "json" | "excel")
          : undefined,
      requested_at: input.created_at
        ? toISOStringSafe(input.created_at)
        : "2300-01-01T00:00:00.000Z",
      completed_at: input.completed_at
        ? toISOStringSafe(input.completed_at)
        : undefined,
      file_url: input.file_path
        ? `https://example.com/download/${input.file_path}`
        : input.download_url,
      file_size_bytes: undefined,
      records_count: undefined,
      entity_types: input.requested_fields ? [input.requested_fields] : [],
      created_by: input.admin?.id ?? "00000000-0000-0000-0000-000000000000",
      filters: Number(input.filters) ?? 0,
      request_id: undefined,
      batch_job_id: undefined,
      export_type:
        input.delivery_method !== undefined
          ? (input.delivery_method satisfies string as
              | "individual"
              | "bulk"
              | "scheduled")
          : undefined,
      target_environment: "production",
      security_policy: input.encrypted ? "encrypted" : "standard",
      error_message: input.error_message,
    };
  }
}
