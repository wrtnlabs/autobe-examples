import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IPageIDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardGuest";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchDiscussionBoardModeratorGuests(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardGuest.IRequest;
}): Promise<IPageIDiscussionBoardGuest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const buildWhereCondition = () => {
    const conditions: Record<string, unknown> = {};

    if (props.body.search) {
      conditions.OR = [
        { session_identifier: { contains: props.body.search } },
        { ip_address: { contains: props.body.search } },
        { user_agent: { contains: props.body.search } },
      ];
    }

    if (props.body.ip_address) {
      conditions.ip_address = { contains: props.body.ip_address };
    }

    if (props.body.user_agent_contains) {
      conditions.user_agent = { contains: props.body.user_agent_contains };
    }

    if (props.body.first_visit_from || props.body.first_visit_to) {
      const first_visit_at: Record<string, Date> = {};
      if (props.body.first_visit_from) {
        first_visit_at.gte = new Date(props.body.first_visit_from);
      }
      if (props.body.first_visit_to) {
        first_visit_at.lte = new Date(props.body.first_visit_to);
      }
      conditions.first_visit_at = first_visit_at;
    }

    if (props.body.last_visit_from || props.body.last_visit_to) {
      const last_visit_at: Record<string, Date> = {};
      if (props.body.last_visit_from) {
        last_visit_at.gte = new Date(props.body.last_visit_from);
      }
      if (props.body.last_visit_to) {
        last_visit_at.lte = new Date(props.body.last_visit_to);
      }
      conditions.last_visit_at = last_visit_at;
    }

    if (
      props.body.min_page_views !== undefined ||
      props.body.max_page_views !== undefined
    ) {
      const page_views: Record<string, number> = {};
      if (props.body.min_page_views !== undefined) {
        page_views.gte = props.body.min_page_views;
      }
      if (props.body.max_page_views !== undefined) {
        page_views.lte = props.body.max_page_views;
      }
      conditions.page_views = page_views;
    }

    return conditions;
  };

  const whereCondition = buildWhereCondition();
  const orderByField = props.body.sort_by ?? "last_visit_at";
  const orderDirection = props.body.order ?? "desc";

  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_guests.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: { [orderByField]: orderDirection },
    }),
    MyGlobal.prisma.discussion_board_guests.count({ where: whereCondition }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((guest) => ({
      id: guest.id,
      session_identifier: guest.session_identifier,
      first_visit_at: toISOStringSafe(guest.first_visit_at),
      last_visit_at: toISOStringSafe(guest.last_visit_at),
      page_views: guest.page_views,
      created_at: toISOStringSafe(guest.created_at),
      updated_at: toISOStringSafe(guest.updated_at),
    })),
  };
}
