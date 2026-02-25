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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommercePlatformOversightAtSummaryTransformer } from "../transformers/EcommercePlatformOversightAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdministratorPlatformOversights(props: {
  administrator: AdministratorPayload;
  body: IEcommercePlatformOversight.IRequest;
}): Promise<IPageIEcommercePlatformOversight.ISummary> {
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.min(Math.max(1, props.body.limit ?? 20), 100);
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_platform_oversightsWhereInput = {
    ...(props.body.oversight_type !== undefined &&
      props.body.oversight_type !== null && {
        oversight_type: props.body.oversight_type,
      }),
    ...(props.body.severity_level !== undefined &&
      props.body.severity_level !== null && {
        severity_level: props.body.severity_level,
      }),
    ...(props.body.resolved !== undefined &&
      props.body.resolved !== null && {
        resolved: props.body.resolved,
      }),
    ...(props.body.administrator_id !== undefined && {
      administrator_id: props.body.administrator_id,
    }),
    ...(props.body.created_after !== undefined && {
      created_at: { gte: new Date(props.body.created_after) },
    }),
    ...(props.body.created_before !== undefined && {
      created_at: { lte: new Date(props.body.created_before) },
    }),
  };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_platform_oversights.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommercePlatformOversightAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_platform_oversights.count({
      where: whereInput,
    }),
  ]);
  return {
    data: await Promise.all(
      data.map(EcommercePlatformOversightAtSummaryTransformer.transform),
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
