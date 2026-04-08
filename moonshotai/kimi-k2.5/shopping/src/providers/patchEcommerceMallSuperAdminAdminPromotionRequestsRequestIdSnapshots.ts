import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallAdminPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminPromotionRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallAdminPromotionRequestSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallAdminPromotionRequestSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdminAdminPromotionRequestsRequestIdSnapshots(props: {
  superAdmin: SuperadminPayload;
  requestId: string;
  body: IEcommerceMallAdminPromotionRequestSnapshot.IRequest;
}): Promise<IPageIEcommerceMallAdminPromotionRequestSnapshot.ISummary> {
  // Verify promotion request exists
  await MyGlobal.prisma.ecommerce_mall_admin_promotion_requests.findUniqueOrThrow(
    {
      where: { id: props.requestId },
      select: { id: true },
    },
  );
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build date range filter if provided
  const createdAtFilter:
    | {
        gte?: Date;
        lte?: Date;
      }
    | undefined =
    props.body.created_at_from !== undefined ||
    props.body.created_at_to !== undefined
      ? {
          ...(props.body.created_at_from !== undefined && {
            gte: new Date(props.body.created_at_from),
          }),
          ...(props.body.created_at_to !== undefined && {
            lte: new Date(props.body.created_at_to),
          }),
        }
      : undefined;
  // Build where clause with optional filters
  const where: Prisma.ecommerce_mall_admin_promotion_request_snapshotsWhereInput =
    {
      admin_promotion_request_id: props.requestId,
      ...(props.body.previous_status !== undefined && {
        previous_status: props.body.previous_status,
      }),
      ...(props.body.new_status !== undefined && {
        new_status: props.body.new_status,
      }),
      ...(props.body.previous_reviewer_id !== undefined && {
        previous_reviewer_id: props.body.previous_reviewer_id,
      }),
      ...(props.body.new_reviewer_id !== undefined && {
        new_reviewer_id: props.body.new_reviewer_id,
      }),
      ...(createdAtFilter !== undefined && { created_at: createdAtFilter }),
    };
  // Retrieve paginated snapshots
  const snapshots =
    await MyGlobal.prisma.ecommerce_mall_admin_promotion_request_snapshots.findMany(
      {
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        ...EcommerceMallAdminPromotionRequestSnapshotAtSummaryTransformer.select(),
      },
    );
  // Get total count for pagination
  const total =
    await MyGlobal.prisma.ecommerce_mall_admin_promotion_request_snapshots.count(
      { where },
    );
  // Transform to DTOs
  const data = await ArrayUtil.asyncMap(
    snapshots,
    EcommerceMallAdminPromotionRequestSnapshotAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
