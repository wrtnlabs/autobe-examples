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
  const entityTypes = props.body.entityTypes ?? [
    "product",
    "category",
    "review",
    "all",
  ];
  const entityIds = props.body.entityIds ?? [];
  // Count total entities to reindex
  let totalEntityCount = 0;
  if (entityTypes.includes("all")) {
    // Count all products
    const productCount = await MyGlobal.prisma.ecommerce_mall_products.count({
      where: { deleted_at: null },
    });
    totalEntityCount += productCount;
    // Count all categories
    const categoryCount = await MyGlobal.prisma.ecommerce_mall_categories.count(
      {
        where: { deleted_at: null },
      },
    );
    totalEntityCount += categoryCount;
    // Count all reviews
    const reviewCount = await MyGlobal.prisma.ecommerce_mall_reviews.count({
      where: { deleted_at: null },
    });
    totalEntityCount += reviewCount;
  } else {
    // Count specific entity types
    if (entityTypes.includes("product")) {
      const productCount = await MyGlobal.prisma.ecommerce_mall_products.count({
        where: {
          deleted_at: null,
          ...(entityIds.length > 0 && {
            id: { in: entityIds as (string & tags.Format<"uuid">)[] },
          }),
        },
      });
      totalEntityCount += productCount;
    }
    if (entityTypes.includes("category")) {
      const categoryCount =
        await MyGlobal.prisma.ecommerce_mall_categories.count({
          where: {
            deleted_at: null,
            ...(entityIds.length > 0 && {
              id: { in: entityIds as (string & tags.Format<"uuid">)[] },
            }),
          },
        });
      totalEntityCount += categoryCount;
    }
    if (entityTypes.includes("review")) {
      const reviewCount = await MyGlobal.prisma.ecommerce_mall_reviews.count({
        where: {
          deleted_at: null,
          ...(entityIds.length > 0 && {
            id: { in: entityIds as (string & tags.Format<"uuid">)[] },
          }),
        },
      });
      totalEntityCount += reviewCount;
    }
  }
  // Create reindex job record
  const jobId: string & tags.Format<"uuid"> = v4();
  const now = new Date();
  const job = await MyGlobal.prisma.ecommerce_mall_search_indices.create({
    data: {
      id: jobId,
      entity_id: "00000000-0000-0000-0000-000000000000", // Job tracking ID placeholder
      entity_type: "reindex_job",
      title: `Reindex Job: ${entityTypes.join(", ")}`,
      searchable_text: `Reindexing entities: ${entityTypes.join(", ")}`,
      status: "queued",
      metadata: JSON.stringify({
        entityTypes: entityTypes as string[],
        entityIds: entityIds as string[],
        createdBy: props.admin.id,
      }),
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  return {
    id: jobId,
    entityTypes: entityTypes as string[],
    totalEntityCount: totalEntityCount,
    status: "queued" as "queued" | "processing" | "completed" | "failed",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    completedAt: null,
    estimatedCompletionTime: null,
  } satisfies IEcommerceMallSearchIndicesReindexJob;
}
