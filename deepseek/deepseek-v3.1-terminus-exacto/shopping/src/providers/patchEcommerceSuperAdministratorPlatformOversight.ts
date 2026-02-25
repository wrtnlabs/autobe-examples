import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEcommercePlatformOversight } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOversight";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommercePlatformOversight } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformOversight";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { EcommercePlatformOversightAtSummaryTransformer } from "../transformers/EcommercePlatformOversightAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceSuperAdministratorPlatformOversight(props: {
  superAdministrator: SuperadministratorPayload;
  body: IEcommercePlatformOversight.IRequest;
}): Promise<IPageIEcommercePlatformOversight.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const validatedLimit = Math.min(Math.max(limit, 1), 100);
  const skip = (page - 1) * validatedLimit;
  // Build where clause from filter parameters
  const whereInput = {
    ...(props.body.oversight_type !== undefined &&
      props.body.oversight_type !== null && {
        oversight_type: props.body.oversight_type,
      }),
    ...(props.body.severity_level !== undefined &&
      props.body.severity_level !== null && {
        severity_level: props.body.severity_level,
      }),
    ...(props.body.resolved !== undefined &&
      props.body.resolved !== null && { resolved: props.body.resolved }),
    ...(props.body.administrator_id !== undefined && {
      administrator_id: props.body.administrator_id,
    }),
    ...(props.body.created_after !== undefined && {
      created_at: { gte: new Date(props.body.created_after) },
    }),
    ...(props.body.created_before !== undefined && {
      created_at: { lte: new Date(props.body.created_before) },
    }),
  } satisfies Prisma.ecommerce_platform_oversightsWhereInput;
  // Query data with pagination
  const data = await MyGlobal.prisma.ecommerce_platform_oversights.findMany({
    where: whereInput,
    skip,
    take: validatedLimit,
    orderBy: { created_at: "desc" },
    ...EcommercePlatformOversightAtSummaryTransformer.select(),
  });
  // Count total records
  const total = await MyGlobal.prisma.ecommerce_platform_oversights.count({
    where: whereInput,
  });
  // Transform data using transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommercePlatformOversightAtSummaryTransformer.transform,
  );
  // Return paginated response
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: validatedLimit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / validatedLimit),
    } satisfies IPage.IPagination,
  };
}
