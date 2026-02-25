import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSystemReferenceData } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSystemReferenceData";
import { IShoppingMallSystemReferenceData } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemReferenceData";
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

export async function patchShoppingMallAdminReferenceData(props: {
  admin: AdminPayload;
  body: IShoppingMallSystemReferenceData.IRequest;
}): Promise<IPageIShoppingMallSystemReferenceData.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where: Prisma.shopping_mall_system_reference_dataWhereInput = {
    ...(props.body.name && { name: { equals: props.body.name } }),
    ...(props.body.value && { value: { equals: props.body.value } }),
  } satisfies Prisma.shopping_mall_system_reference_dataWhereInput;
  const data =
    await MyGlobal.prisma.shopping_mall_system_reference_data.findMany({
      where,
      skip,
      take: limit,
      orderBy: { sort_order: "asc" },
      select: {
        id: true,
        name: true,
        value: true,
        label: true,
        description: true,
        sort_order: true,
        is_active: true,
      },
    });
  const total = await MyGlobal.prisma.shopping_mall_system_reference_data.count(
    {
      where,
    },
  );
  return {
    data: data.map((record) => ({
      id: record.id as string & tags.Format<"uuid">,
      name: record.name,
      value: record.value,
      label: record.label,
      description: record.description,
      sort_order: record.sort_order ?? null,
      is_active: record.is_active,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
