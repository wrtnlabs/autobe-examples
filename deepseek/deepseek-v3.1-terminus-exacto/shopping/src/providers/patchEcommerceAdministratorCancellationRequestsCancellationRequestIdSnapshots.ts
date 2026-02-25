import { IEcommerceCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCancellationRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceCancellationRequestSnapshotAtSummaryTransformer } from "../transformers/EcommerceCancellationRequestSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdministratorCancellationRequestsCancellationRequestIdSnapshots(props: {
  administrator: AdministratorPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
  body: IEcommerceCancellationRequestSnapshot.IRequest;
}): Promise<IPageIEcommerceCancellationRequestSnapshot.ISummary> {
  // Verify cancellation request exists
  await MyGlobal.prisma.ecommerce_cancellation_requests.findUniqueOrThrow({
    where: { id: props.cancellationRequestId },
  });
  // Build WHERE clause with proper Prisma syntax
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Create base whereInput with proper typing
  const whereInput: Prisma.ecommerce_cancellation_request_snapshotsWhereInput =
    {
      ecommerce_cancellation_request_id: props.cancellationRequestId,
      ...(props.body.status && { status: props.body.status }),
    };
  // Add date range filtering if both bounds are provided
  if (props.body.created_at_start && props.body.created_at_end) {
    whereInput.created_at = {
      gte: new Date(props.body.created_at_start),
      lte: new Date(props.body.created_at_end),
    };
  } else if (props.body.created_at_start) {
    whereInput.created_at = { gte: new Date(props.body.created_at_start) };
  } else if (props.body.created_at_end) {
    whereInput.created_at = { lte: new Date(props.body.created_at_end) };
  }
  // Sequential queries as required
  const data =
    await MyGlobal.prisma.ecommerce_cancellation_request_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceCancellationRequestSnapshotAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.ecommerce_cancellation_request_snapshots.count({
      where: whereInput,
    });
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceCancellationRequestSnapshotAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit) || 0,
    } satisfies IPage.IPagination,
  };
}
