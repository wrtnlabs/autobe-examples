import { IEcommerceSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSystemConfig";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function patchEcommerceAdminSystemConfigs(props: {
  admin: AdminPayload;
  body: IEcommerceSystemConfig.IRequest;
}): Promise<{
  data: IEcommerceSystemConfig[];
  pagination: {
    current: number;
    limit: number;
    records: number;
    pages: number;
  };
}> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    key: props.body.key,
    description: props.body.search
      ? { contains: props.body.search }
      : undefined,
    created_at: {
      gte: props.body.created_at_min,
      lte: props.body.created_at_max,
    },
  };
  const data = await MyGlobal.prisma.ecommerce_system_configs.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { updated_at: "desc" },
    select: {
      id: true,
      key: true,
      value: true,
      description: true,
      created_at: true,
      updated_at: true,
    },
  });
  const total = await MyGlobal.prisma.ecommerce_system_configs.count({
    where: whereInput,
  });
  return {
    data: data.map((config) => ({
      id: config.id,
      key: config.key,
      value: config.value,
      description: config.description,
      created_at: toISOStringSafe(config.created_at),
      updated_at: toISOStringSafe(config.updated_at),
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
