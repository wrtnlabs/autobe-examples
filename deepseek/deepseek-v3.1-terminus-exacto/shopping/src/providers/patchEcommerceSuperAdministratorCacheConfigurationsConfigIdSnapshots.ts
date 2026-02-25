import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEcommerceCacheConfigurationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationSnapshot";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceCacheConfigurationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCacheConfigurationSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { EcommerceCacheConfigurationSnapshotAtSummaryTransformer } from "../transformers/EcommerceCacheConfigurationSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceSuperAdministratorCacheConfigurationsConfigIdSnapshots(props: {
  superAdministrator: SuperadministratorPayload;
  configId: string & tags.Format<"uuid">;
  body: IEcommerceCacheConfigurationSnapshot.IRequest;
}): Promise<IPageIEcommerceCacheConfigurationSnapshot.ISummary> {
  // Verify cache configuration exists
  await MyGlobal.prisma.ecommerce_cache_configurations.findUniqueOrThrow({
    where: { id: props.configId, deleted_at: null },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE conditions for cache configuration snapshots
  const whereInput = {
    ecommerce_cache_configuration_id: props.configId,
    ...(props.body.status && {
      OR: [
        {
          configuration_state_before: {
            contains: `"status":"${props.body.status}"`,
            mode: "insensitive",
          },
        },
        {
          configuration_state_after: {
            contains: `"status":"${props.body.status}"`,
            mode: "insensitive",
          },
        },
      ],
    }),
    ...(props.body.suspension_start_date_min && {
      created_at: { gte: props.body.suspension_start_date_min },
    }),
    ...(props.body.suspension_start_date_max && {
      created_at: { lte: props.body.suspension_start_date_max },
    }),
    ...(props.body.suspension_end_date_min && {
      created_at: { gte: props.body.suspension_end_date_min },
    }),
    ...(props.body.suspension_end_date_max && {
      created_at: { lte: props.body.suspension_end_date_max },
    }),
    ...(props.body.suspension_reason_search && {
      change_reason: {
        contains: props.body.suspension_reason_search,
        mode: "insensitive",
      },
    }),
  } satisfies Prisma.ecommerce_cache_configuration_snapshotsWhereInput;
  // Get paginated data
  const data =
    await MyGlobal.prisma.ecommerce_cache_configuration_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceCacheConfigurationSnapshotAtSummaryTransformer.select(),
    });
  // Get total count
  const total =
    await MyGlobal.prisma.ecommerce_cache_configuration_snapshots.count({
      where: whereInput,
    });
  // Transform data
  const transformedData = await ArrayUtil.asyncMap(
    data as any,
    EcommerceCacheConfigurationSnapshotAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
