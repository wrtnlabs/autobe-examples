import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminShoppingMallChannelsChannelCodeShoppingMallSectionsSectionCode(props: {
  admin: AdminPayload;
  channelCode: string;
  sectionCode: string;
  body: IShoppingMallSection.IUpdate;
}): Promise<IShoppingMallSection> {
  const existing = await MyGlobal.prisma.shopping_mall_sections.findUnique({
    where: {
      code: props.sectionCode satisfies string as string,
      shopping_mall_channel_id: props.channelCode satisfies string as string,
    },
  });

  if (!existing) {
    throw new HttpException("Section not found", 404);
  }

  const updateData: {
    name?: string;
    updated_at: string & tags.Format<"date-time">;
  } = {
    updated_at: toISOStringSafe(new Date()),
  };

  if (
    Object.prototype.hasOwnProperty.call(props.body, "name") &&
    props.body.name !== undefined
  ) {
    updateData.name = props.body.name;
  }

  const updated = await MyGlobal.prisma.shopping_mall_sections.update({
    where: {
      code: props.sectionCode satisfies string as string,
      shopping_mall_channel_id: props.channelCode satisfies string as string,
    },
    data: updateData,
  });

  return {
    code: updated.code,
    channelCode: updated.shopping_mall_channel_id,
    name: updated.name,
    description: undefined,
    order: 0 satisfies number & tags.Type<"int32">,
    isActive: true,
    createdAt: toISOStringSafe(updated.created_at),
    updatedAt: updated.updated_at ? toISOStringSafe(updated.updated_at) : null,
    deletedAt: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
