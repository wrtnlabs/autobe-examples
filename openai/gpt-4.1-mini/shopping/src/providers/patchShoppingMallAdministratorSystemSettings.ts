import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSystemSetting";
import { IShoppingMallSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemSetting";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorSystemSettings(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallSystemSetting.IRequest;
}): Promise<IPageIShoppingMallSystemSetting.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  if (page < 1) {
    throw new HttpException("Page must be >= 1", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }
  const andConditions = [] as Prisma.shopping_mall_system_settingsWhereInput[];
  if (props.body.key != null) {
    andConditions.push({ key: { contains: props.body.key } });
  }
  if (props.body.dataType != null) {
    andConditions.push({ data_type: props.body.dataType });
  }
  if (props.body.description != null) {
    andConditions.push({ description: { contains: props.body.description } });
  }
  const where: Prisma.shopping_mall_system_settingsWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};
  const data = await MyGlobal.prisma.shopping_mall_system_settings.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { key: "asc" },
    select: {
      id: true,
      key: true,
      value: true,
      description: true,
      data_type: true,
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_system_settings.count({
    where,
  });
  return {
    data: data.map((item) => ({
      id: item.id,
      key: item.key,
      value: item.value,
      description: item.description ?? null,
      dataType: item.data_type,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
