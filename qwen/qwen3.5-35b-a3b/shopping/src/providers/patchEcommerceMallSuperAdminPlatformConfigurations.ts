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
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { EcommerceMallPlatformConfigurationAtSummaryTransformer } from "../transformers/EcommerceMallPlatformConfigurationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdminPlatformConfigurations(props: {
  superAdmin: SuperAdminPayload;
  body: IEcommerceMallPlatformConfiguration.IRequest;
}): Promise<IPageIEcommerceMallPlatformConfiguration.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause with all filters
  const whereInput: Prisma.ecommerce_mall_platform_configurationsWhereInput = {
    deleted_at: null,
    ...(props.body.search !== undefined && {
      description: { contains: props.body.search },
    }),
    ...(props.body.configuration_key_exact !== undefined && {
      configuration_key: props.body.configuration_key_exact,
    }),
    ...(props.body.configuration_type !== undefined && {
      configuration_type: props.body.configuration_type,
    }),
    ...(props.body.scope !== undefined && {
      scope: props.body.scope,
    }),
    ...(props.body.is_active !== undefined && {
      is_active: props.body.is_active,
    }),
  };
  // Build orderBy clause
  const orderByInput = (() => {
    const sortBy = props.body.sort_by ?? "created_at";
    const sortOrder = (props.body.sort_order ?? "desc") as "asc" | "desc";
    if (sortBy === "configuration_key") {
      return { configuration_key: sortOrder };
    } else if (sortBy === "updated_at") {
      return { updated_at: sortOrder };
    }
    // Default to created_at
    return { created_at: sortOrder };
  })();
  // Execute queries in parallel
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_platform_configurations.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...EcommerceMallPlatformConfigurationAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_platform_configurations.count({
      where: whereInput,
    }),
  ]);
  // Transform data and return paginated response
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallPlatformConfigurationAtSummaryTransformer.transform,
    ),
  };
}
