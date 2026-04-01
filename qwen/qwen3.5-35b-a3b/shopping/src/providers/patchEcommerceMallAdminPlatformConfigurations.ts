import { IEcommerceMallPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallPlatformConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallPlatformConfiguration";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallPlatformConfigurationAtSummaryTransformer } from "../transformers/EcommerceMallPlatformConfigurationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminPlatformConfigurations(props: {
  admin: AdminPayload;
  body: IEcommerceMallPlatformConfiguration.IRequest;
}): Promise<IPageIEcommerceMallPlatformConfiguration.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const search = props.body.search;
  const configuration_key_exact = props.body.configuration_key_exact;
  const configuration_type = props.body.configuration_type;
  const scope = props.body.scope;
  const is_active = props.body.is_active;
  const whereInput: Prisma.ecommerce_mall_platform_configurationsWhereInput = {
    deleted_at: null,
    ...(search !== undefined && {
      description: {
        contains: search,
        mode: "insensitive" as const,
      },
    }),
    ...(configuration_key_exact !== undefined && {
      configuration_key: configuration_key_exact,
    }),
    ...(configuration_type !== undefined && {
      configuration_type: configuration_type,
    }),
    ...(scope !== undefined && {
      scope: scope,
    }),
    ...(is_active !== undefined && {
      is_active: is_active,
    }),
  } satisfies Prisma.ecommerce_mall_platform_configurationsWhereInput;
  const sortField = props.body.sort_by ?? "created_at";
  const sortOrder = props.body.sort_order ?? "desc";
  const orderByInput = {
    [sortField]: sortOrder,
  } satisfies Prisma.ecommerce_mall_platform_configurationsOrderByWithRelationInput;
  const data =
    await MyGlobal.prisma.ecommerce_mall_platform_configurations.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...EcommerceMallPlatformConfigurationAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.ecommerce_mall_platform_configurations.count({
      where: whereInput,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallPlatformConfigurationAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
