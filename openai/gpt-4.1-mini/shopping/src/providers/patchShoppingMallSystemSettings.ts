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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSystemSettings(props: {
  body: IShoppingMallSystemSetting.IRequest;
}): Promise<IPageIShoppingMallSystemSetting.ISummary> {
  const page = (props.body as any).page ?? 1;
  const limit = (props.body as any).limit ?? 100;
  const skip = (page - 1) * limit;
  const where: Prisma.shopping_mall_system_settingsWhereInput = {
    deleted_at: null,
    ...((props.body as any).key
      ? { key: { contains: (props.body as any).key } }
      : {}),
    ...((props.body as any).data_type
      ? { data_type: (props.body as any).data_type }
      : {}),
    ...((props.body as any).created_at_start ||
    (props.body as any).created_at_end
      ? {
          created_at: {
            ...((props.body as any).created_at_start
              ? { gte: (props.body as any).created_at_start }
              : {}),
            ...((props.body as any).created_at_end
              ? { lte: (props.body as any).created_at_end }
              : {}),
          },
        }
      : {}),
    ...((props.body as any).updated_at_start ||
    (props.body as any).updated_at_end
      ? {
          updated_at: {
            ...((props.body as any).updated_at_start
              ? { gte: (props.body as any).updated_at_start }
              : {}),
            ...((props.body as any).updated_at_end
              ? { lte: (props.body as any).updated_at_end }
              : {}),
          },
        }
      : {}),
  };
  const [records, data] = await Promise.all([
    MyGlobal.prisma.shopping_mall_system_settings.count({ where }),
    MyGlobal.prisma.shopping_mall_system_settings.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        key: true,
        value: true,
        data_type: true,
        description: true,
        created_at: true,
        updated_at: true,
      },
    }),
  ]);
  return {
    data: data.map((record) => ({
      key: record.key,
      value: record.value,
      data_type: record.data_type,
      description: record.description,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: records,
      pages: Math.ceil(records / limit),
    },
  };
}
