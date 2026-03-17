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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminPlatformConfigurations(props: {
  admin: AdminPayload;
  body: IEcommerceMallPlatformConfiguration.IRequest;
}): Promise<IPageIEcommerceMallPlatformConfiguration.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_platform_configurationsWhereInput = {
    deleted_at: null,
    ...(props.body.search !== undefined &&
      props.body.search !== "" && {
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
  const orderByInput: Prisma.ecommerce_mall_platform_configurationsOrderByWithRelationInput =
    props.body.sort_by === "updated_at"
      ? {
          updated_at:
            props.body.sort_order === "asc"
              ? ("asc" as const)
              : ("desc" as const),
        }
      : props.body.sort_by === "configuration_key"
        ? {
            configuration_key:
              props.body.sort_order === "asc"
                ? ("asc" as const)
                : ("desc" as const),
          }
        : {
            created_at:
              props.body.sort_order === "asc"
                ? ("asc" as const)
                : ("desc" as const),
          };
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
        updated_at: true,
      } satisfies Prisma.ecommerce_mall_platform_configurationsSelect,
    });
  const total =
    await MyGlobal.prisma.ecommerce_mall_platform_configurations.count({
      where: whereInput,
    });
  const pages = total === 0 ? 0 : Math.ceil(total / limit);
  const transformedData: IEcommerceMallPlatformConfiguration.ISummary[] =
    data.map((item) => ({
      id: item.id as string & tags.Format<"uuid">,
      configuration_key: item.configuration_key,
      description: item.description,
      configuration_type: item.configuration_type,
      scope: item.scope,
      default_value: item.default_value,
      is_active: item.is_active,
      created_at: item.created_at.toISOString() as string &
        tags.Format<"date-time">,
      updated_at: item.updated_at.toISOString() as string &
        tags.Format<"date-time">,
    }));
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIEcommerceMallPlatformConfiguration.ISummary;
}
