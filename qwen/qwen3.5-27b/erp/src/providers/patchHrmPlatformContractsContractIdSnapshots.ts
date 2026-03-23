import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformContractSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContractSnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformContractSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformContractSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmPlatformContractSnapshotAtSummaryTransformer } from "../transformers/HrmPlatformContractSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformContractsContractIdSnapshots(props: {
  contractId: string & tags.Format<"uuid">;
  body: IHrmPlatformContractSnapshot.IRequest;
}): Promise<IPageIHrmPlatformContractSnapshot.ISummary> {
  // Verify contract exists and is not soft-deleted
  await MyGlobal.prisma.hrm_platform_contracts.findUniqueOrThrow({
    where: {
      id: props.contractId,
      deleted_at: null,
    },
  });
  // Parse pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause for date range filtering
  const whereInput: Prisma.hrm_platform_contract_snapshotsWhereInput = {
    hrm_platform_contract_id: props.contractId,
    ...(props.body.created_at_start && {
      created_at: {
        gte: new Date(props.body.created_at_start),
      },
    }),
    ...(props.body.created_at_end && {
      created_at: {
        lte: new Date(props.body.created_at_end),
      },
    }),
  };
  // Fetch paginated snapshots
  const snapshots =
    await MyGlobal.prisma.hrm_platform_contract_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...HrmPlatformContractSnapshotAtSummaryTransformer.select(),
    });
  // Count total matching records
  const total = await MyGlobal.prisma.hrm_platform_contract_snapshots.count({
    where: whereInput,
  });
  // Transform snapshots to summary DTOs
  const data = await ArrayUtil.asyncMap(
    snapshots,
    HrmPlatformContractSnapshotAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
