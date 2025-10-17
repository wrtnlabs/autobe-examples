import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";
import { IPageIShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallConfiguration";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminShoppingMallConfigurations(props: {
  admin: AdminPayload;
  body: IShoppingMallConfiguration.IRequest;
}): Promise<IPageIShoppingMallConfiguration.ISummary> {
  const { body } = props;

  const page = (body.page ?? 1) as number & tags.Type<"int32"> as number;
  const limit = (body.limit ?? 20) as number & tags.Type<"int32"> as number;
  const skip = (page - 1) * limit;

  const [records, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_configurations.findMany({
      where: {
        deleted_at: null,
        ...(body.key !== undefined &&
          body.key !== null && {
            key: { contains: body.key },
          }),
        ...(body.category !== undefined &&
          body.category !== null && {
            category: { contains: body.category },
          }),
        ...(body.enabled !== undefined &&
          body.enabled !== null && {
            enabled: body.enabled,
          }),
      },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        key: true,
        value: true,
        category: true,
        description: true,
        enabled: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_configurations.count({
      where: {
        deleted_at: null,
        ...(body.key !== undefined &&
          body.key !== null && {
            key: { contains: body.key },
          }),
        ...(body.category !== undefined &&
          body.category !== null && {
            category: { contains: body.category },
          }),
        ...(body.enabled !== undefined &&
          body.enabled !== null && {
            enabled: body.enabled,
          }),
      },
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map((record) => ({
      id: record.id as string & tags.Format<"uuid">,
      key: record.key,
      value: record.value,
      category: record.category === null ? undefined : record.category,
      description: record.description === null ? undefined : record.description,
      enabled: record.enabled,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
      deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
    })),
  };
}
