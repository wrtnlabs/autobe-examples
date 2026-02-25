import { IEcommerceSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSystemSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSystemSetting";
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

export async function patchEcommerceAdministratorSystemSettings(props: {
  administrator: AdministratorPayload;
  body: IEcommerceSystemSetting.IRequest;
}): Promise<IPageIEcommerceSystemSetting.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build dynamic where clause
  const whereInput: Prisma.ecommerce_system_settingsWhereInput = {
    deleted_at: null,
    ...(props.body.search && {
      setting_key: { contains: props.body.search, mode: "insensitive" },
    }),
    ...(props.body.value_type && { value_type: props.body.value_type }),
    ...(props.body.is_active !== undefined && {
      is_active: props.body.is_active,
    }),
  } satisfies Prisma.ecommerce_system_settingsWhereInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_system_settings.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { setting_key: "asc" },
      select: {
        setting_key: true,
        value_type: true,
        is_active: true,
        description: true,
        created_at: true,
        updated_at: true,
      } satisfies Prisma.ecommerce_system_settingsFindManyArgs["select"],
    }),
    MyGlobal.prisma.ecommerce_system_settings.count({
      where: whereInput,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data.map(
      (setting) =>
        ({
          setting_key: setting.setting_key,
          value_type: setting.value_type,
          is_active: setting.is_active,
          description: setting.description,
        }) satisfies IEcommerceSystemSetting.ISummary,
    ),
  } satisfies IPageIEcommerceSystemSetting.ISummary;
}
