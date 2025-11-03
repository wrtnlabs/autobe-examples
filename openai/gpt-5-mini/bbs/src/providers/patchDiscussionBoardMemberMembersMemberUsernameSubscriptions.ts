import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSubscription";
import { IPageIDiscussionBoardSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSubscription";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchDiscussionBoardMemberMembersMemberUsernameSubscriptions(props: {
  member: MemberPayload;
  memberUsername: string;
  body: IDiscussionBoardSubscription.IRequest;
}): Promise<IPageIDiscussionBoardSubscription.ISummary> {
  try {
    const { member, memberUsername, body } = props;

    // Resolve target member by username
    const target = await MyGlobal.prisma.discussion_board_member.findUnique({
      where: { username: memberUsername },
      select: { id: true },
    });
    if (!target) throw new HttpException("Not Found", 404);

    // Authorization: only the owner may list their subscriptions
    if (member.id !== target.id) {
      throw new HttpException(
        "Unauthorized: cannot list another member's subscriptions",
        403,
      );
    }

    // Pagination defaults and validation
    const page = (body && body.page) ?? 1;
    const limit = (body && body.limit) ?? 20;
    if (!(Number.isFinite(page) && page >= 1)) {
      throw new HttpException("Bad Request: page must be >= 1", 400);
    }
    if (!(Number.isFinite(limit) && limit >= 1 && limit <= 100)) {
      throw new HttpException(
        "Bad Request: limit must be between 1 and 100",
        400,
      );
    }

    // Build where conditions inline
    const whereCondition: Record<string, unknown> = {
      discussion_board_member_id: target.id,
      deleted_at: null,
    };

    if (body && body.deliveryMode !== undefined && body.deliveryMode !== null) {
      whereCondition.delivery_mode = body.deliveryMode;
    }
    if (body && body.active !== undefined && body.active !== null) {
      whereCondition.active = body.active;
    }
    if (body && body.search !== undefined && body.search !== null) {
      const s = body.search;
      // If search looks like a UUID (36-char dashed), filter by target_id exact match
      const uuidLike =
        typeof s === "string" &&
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
          s,
        );
      if (uuidLike) whereCondition.target_id = s;
    }

    // Perform count and fetch in parallel
    const [total, results] = await Promise.all([
      MyGlobal.prisma.discussion_board_subscriptions.count({
        where: whereCondition,
      }),
      MyGlobal.prisma.discussion_board_subscriptions.findMany({
        where: whereCondition,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          member: {
            select: {
              id: true,
              username: true,
              display_name: true,
              created_at: true,
            },
          },
        },
      }),
    ]);

    const data = results.map((r) => ({
      id: r.id,
      member: {
        id: r.member.id,
        username: r.member.username,
        display_name:
          r.member.display_name === null ? null : r.member.display_name,
        created_at: toISOStringSafe(r.member.created_at),
      },
      targetType: typia.assert<"author" | "article">(r.target_type),
      targetId: r.target_id,
      deliveryMode: typia.assert<"immediate" | "daily_digest">(r.delivery_mode),
      active: r.active,
      lastNotifiedAt: r.last_notified_at
        ? toISOStringSafe(r.last_notified_at)
        : null,
      createdAt: toISOStringSafe(r.created_at),
      updatedAt: r.updated_at ? toISOStringSafe(r.updated_at) : null,
      deletedAt: r.deleted_at ? toISOStringSafe(r.deleted_at) : null,
    }));

    const pages = Math.ceil(total / limit);

    return {
      pagination: {
        current: Number(page),
        limit: Number(limit),
        records: total,
        pages: Number(pages),
      },
      data,
    };
  } catch (err) {
    if (err instanceof HttpException) throw err;
    throw new HttpException("Internal Server Error", 500);
  }
}
