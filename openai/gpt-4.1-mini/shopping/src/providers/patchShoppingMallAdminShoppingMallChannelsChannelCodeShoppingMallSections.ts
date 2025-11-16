import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import { IPageIShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSection";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminShoppingMallChannelsChannelCodeShoppingMallSections(props: {
  admin: AdminPayload;
  channelCode: string;
  body: IShoppingMallSection.IRequest;
}): Promise<IPageIShoppingMallSection.ISummary> {
  const channel = await MyGlobal.prisma.shopping_mall_channels.findUnique({
    where: { code: props.channelCode },
  });

  if (!channel) {
    throw new HttpException("Channel not found", 404);
  }

  const whereCondition: Prisma.shopping_mall_sectionsWhereInput = {
    channel: { id: channel.id },
    ...(props.body.isActive === true
      ? { deleted_at: null }
      : props.body.isActive === false
        ? { deleted_at: { not: null } }
        : {}),
    ...(props.body.search
      ? {
          OR: [
            { code: { contains: props.body.search } },
            { name: { contains: props.body.search } },
          ],
        }
      : {}),
  };

  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;

  const validOrderByFields = ["name", "code", "created_at"];
  const orderByField = validOrderByFields.includes(
    props.body.orderBy ?? "created_at",
  )
    ? (props.body.orderBy ?? "created_at")
    : "created_at";
  const orderByCondition = { [orderByField]: "asc" };

  const [sections, totalRecords] = await Promise.all([
    MyGlobal.prisma.shopping_mall_sections.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: orderByCondition,
    }),
    MyGlobal.prisma.shopping_mall_sections.count({ where: whereCondition }),
  ]);

  const data = sections.map((section) => ({
    id: section.id,
    code: section.code,
    name: section.name,
  }));

  return {
    data,
    pagination: {
      current: page,
      limit,
      records: totalRecords,
      pages: Math.ceil(totalRecords / limit),
    },
  };
}
