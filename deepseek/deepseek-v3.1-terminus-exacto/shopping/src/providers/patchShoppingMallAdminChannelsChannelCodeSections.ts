import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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

export async function patchShoppingMallAdminChannelsChannelCodeSections(props: {
  admin: AdminPayload;
  channelCode: string;
  body: IShoppingMallSection.IRequest;
}): Promise<IPageIShoppingMallSection.ISummary> {
  // Verify channel exists
  const channel = await MyGlobal.prisma.shopping_mall_channels.findFirst({
    where: {
      code: props.channelCode,
      deleted_at: null,
    },
  });

  if (!channel) {
    throw new HttpException("Channel not found", 404);
  }

  // Build WHERE conditions
  const whereConditions: Record<string, unknown> = {
    shopping_mall_channel_id: channel.id,
    deleted_at: null,
  };

  // Apply search filter
  if (props.body.search) {
    whereConditions.OR = [
      { name: { contains: props.body.search, mode: "insensitive" } },
      { description: { contains: props.body.search, mode: "insensitive" } },
    ];
  }

  // Apply status filter
  if (props.body.status) {
    whereConditions.status = props.body.status;
  }

  // Apply parent section filter
  if (props.body.parent_section_id) {
    whereConditions.parent_section_id = props.body.parent_section_id;
  }

  // Apply date range filter - handle without Date constructor
  if (props.body.created_at_start || props.body.created_at_end) {
    whereConditions.created_at = {};
    if (props.body.created_at_start) {
      (whereConditions.created_at as Record<string, unknown>).gte =
        props.body.created_at_start;
    }
    if (props.body.created_at_end) {
      (whereConditions.created_at as Record<string, unknown>).lte =
        props.body.created_at_end;
    }
  }

  // Calculate pagination
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;

  // Build ORDER BY
  const orderBy: Record<string, "asc" | "desc"> = {};
  const orderField = props.body.order_by ?? "display_order";
  const orderDirection = props.body.order_direction ?? "asc";

  orderBy[orderField] = orderDirection;

  // Execute queries concurrently
  const [sections, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_sections.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.shopping_mall_sections.count({
      where: whereConditions,
    }),
  ]);

  // Transform results to summary format
  const data = sections.map((section) => ({
    id: section.id,
    name: section.name,
    description: section.description ?? undefined,
    display_order: section.display_order,
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
