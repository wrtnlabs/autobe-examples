import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";

export async function patchDiscussionBoardChannelsChannelNameSections(props: {
  channelName: string;
  body: IDiscussionBoardSection.IRequest;
}): Promise<IPageIDiscussionBoardSection.ISummary> {
  // Find the channel by name
  const channel = await MyGlobal.prisma.discussion_board_channels.findFirst({
    where: {
      name: props.channelName,
      deleted_at: null,
    },
  });

  if (!channel) {
    throw new HttpException("Channel not found", 404);
  }

  // Build WHERE conditions
  const whereConditions: Prisma.discussion_board_sectionsWhereInput = {
    discussion_board_channel_id: channel.id,
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

  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Execute paginated query
  const [sections, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_sections.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      include: {
        channel: true,
      },
    }),
    MyGlobal.prisma.discussion_board_sections.count({
      where: whereConditions,
    }),
  ]);

  // Map results to DTO format
  const data = sections.map((section) => ({
    id: section.id as string & tags.Format<"uuid">,
    name: section.name,
    description: section.description,
    status: section.status,
    channel: {
      id: section.channel.id as string & tags.Format<"uuid">,
      name: section.channel.name,
      description: section.channel.description,
      status: section.channel.status,
      created_at: toISOStringSafe(section.channel.created_at),
    },
    created_at: toISOStringSafe(section.created_at),
    updated_at: toISOStringSafe(section.updated_at),
    deleted_at: section.deleted_at
      ? toISOStringSafe(section.deleted_at)
      : undefined,
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
