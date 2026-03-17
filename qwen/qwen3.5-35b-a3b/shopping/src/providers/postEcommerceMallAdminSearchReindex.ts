import { IEcommerceMallSearchIndicesReindexJob } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSearchIndicesReindexJob";
import { IEcommerceMallSearchIndicesReindexRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSearchIndicesReindexRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAdminSearchReindex(props: {
  admin: AdminPayload;
  body: IEcommerceMallSearchIndicesReindexRequest;
}): Promise<IEcommerceMallSearchIndicesReindexJob> {
  // Determine which entity types to reindex, default to all types if not specified
  const entityTypes = props.body.entityTypes ?? [
    "product",
    "category",
    "review",
  ];
  const specificEntityIds = props.body.entityIds;
  // Generate unique job UUID for tracking the reindexing operation
  const jobId: string & tags.Format<"uuid"> = v4();
  // Calculate total entity count based on requested entity types
  let totalEntityCount: number = 0;
  if (specificEntityIds && specificEntityIds.length > 0) {
    // If specific entity IDs are provided, count them directly
    totalEntityCount = specificEntityIds.length;
  } else {
    // Calculate count based on entity types, querying each relevant table
    const counts = await Promise.all([
      entityTypes.includes("product") || entityTypes.includes("all")
        ? MyGlobal.prisma.ecommerce_mall_products
            .count({ where: { deleted_at: null } })
            .catch(() => 0)
        : Promise.resolve(0),
      entityTypes.includes("category") || entityTypes.includes("all")
        ? MyGlobal.prisma.ecommerce_mall_categories
            .count({ where: { deleted_at: null } })
            .catch(() => 0)
        : Promise.resolve(0),
      entityTypes.includes("review") || entityTypes.includes("all")
        ? MyGlobal.prisma.ecommerce_mall_reviews
            .count({ where: { deleted_at: null } })
            .catch(() => 0)
        : Promise.resolve(0),
    ]);
    totalEntityCount = counts.reduce((sum, count) => sum + count, 0);
  }
  // Convert entityTypes to string array for job record
  const jobEntityTypes: string[] = entityTypes;
  // Create timestamp strings for job creation (using ISO 8601 format)
  const now = new Date();
  const createdAt: string & tags.Format<"date-time"> = toISOStringSafe(now);
  const updatedAt: string & tags.Format<"date-time"> = toISOStringSafe(now);
  const completedAt: (string & tags.Format<"date-time">) | null = null;
  // Estimate completion time based on entity count (1 second per entity, max 10 minutes)
  const estimatedSeconds = Math.min(totalEntityCount, 600);
  const minutes = Math.floor(estimatedSeconds / 60);
  const seconds = estimatedSeconds % 60;
  const estimatedCompletionTime: (string & tags.Format<"duration">) | null =
    estimatedSeconds > 0 ? `PT${minutes}M${seconds}S` : "PT0S";
  // Create and return the job object with all required fields
  const job: IEcommerceMallSearchIndicesReindexJob = {
    id: jobId,
    entityTypes: jobEntityTypes,
    totalEntityCount: totalEntityCount as number & tags.Type<"int32">,
    status: "queued" as const,
    createdAt,
    updatedAt,
    completedAt,
    estimatedCompletionTime,
  } satisfies IEcommerceMallSearchIndicesReindexJob;
  return job;
}
