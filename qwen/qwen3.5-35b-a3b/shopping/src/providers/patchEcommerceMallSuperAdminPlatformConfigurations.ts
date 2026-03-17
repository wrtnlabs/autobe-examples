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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdminPlatformConfigurations(props: {
  superAdmin: SuperadminPayload;
  body: IEcommerceMallPlatformConfiguration.IRequest;
}): Promise<IPageIEcommerceMallPlatformConfiguration.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_platform_configurationsWhereInput = {
    deleted_at: null,
    ...(props.body.search !== undefined && {
      description: {
        contains: props.body.search,
        mode: "insensitive" as const,
      },
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
  const orderByField =
    props.body.sort_by === "updated_at"
      ? "updated_at"
      : props.body.sort_by === "configuration_key"
        ? "configuration_key"
        : "created_at";
  const sortOrder = props.body.sort_order === "desc" ? "desc" : "asc";
  const orderByInput: Prisma.ecommerce_mall_platform_configurationsOrderByWithRelationInput[] =
    [{ [orderByField]: sortOrder }];
  const data =
    await MyGlobal.prisma.ecommerce_mall_platform_configurations.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      select: {
        id: true,
        configuration_key: true,
        description: true,
        configuration_type: true,
        scope: true,
        default_value: true,
        is_active: true,
        created_at: true,
      },
    });
  const total =
    await MyGlobal.prisma.ecommerce_mall_platform_configurations.count({
      where: whereInput,
    });
  const transformedData: IEcommerceMallPlatformConfiguration.ISummary[] =
    data.map((record) => ({
      id: record.id as string & tags.Format<"uuid">,
      configuration_key: record.configuration_key,
      description: record.description,
      configuration_type: record.configuration_type,
      scope: record.scope,
      default_value:
        record.default_value === null ? undefined : record.default_value,
      is_active: record.is_active,
    })) satisfies IEcommerceMallPlatformConfiguration.ISummary[];
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  };
}
