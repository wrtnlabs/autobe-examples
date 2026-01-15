import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallDataExports } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDataExports";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallDataExportsAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_data_exportsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        format: true,
        admin: true,
        request_metadata: true,
        filters: true,
        created_at: true,
        requested_fields: true,
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
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.shopping_mall_data_exportsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallDataExports.ISummary> {
    // Extract exportType from JSON field
    const metadata = input.request_metadata
      ? JSON.parse(input.request_metadata)
      : {};
    const exportType = metadata.type || "unknown";
    // Map status to enum
    const statusMap: {
      [key: string]: "pending" | "processing" | "completed" | "failed";
    } = {
      pending: "pending",
      processing: "processing",
      completed: "completed",
      failed: "failed",
    };
    const exportStatus = statusMap[input.status] || "pending";
    // Map format to enum
    const formatMap: {
      [key: string]: "json" | "csv" | "pdf";
    } = {
      json: "json",
      csv: "csv",
      pdf: "pdf",
    };
    const exportFormat = formatMap[input.format] || "json";
    // Extract description from metadata or filters
    const description = metadata.description || input.filters || "";
    return {
      id: input.id,
      exportType: exportType,
      exportStatus: exportStatus,
      requestedBy: input.admin.id,
      requestedAt: input.created_at.toISOString(),
      exportFormat: exportFormat,
      recordsCount: 0, // Cannot be derived from this table
      description: description,
    };
  }
}
