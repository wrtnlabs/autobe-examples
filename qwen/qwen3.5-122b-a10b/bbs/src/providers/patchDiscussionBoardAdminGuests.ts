import { IDiscussionBoardGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuestSession";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardGuestSession";
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

export async function patchDiscussionBoardAdminGuests(props: {
  admin: AdminPayload;
  body: IDiscussionBoardGuestSession.IRequest;
}): Promise<IPageIDiscussionBoardGuestSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.discussion_board_guest_sessionsWhereInput = {
    ...(props.body.guest_id && {
      discussion_board_guest_id: props.body.guest_id,
    }),
    ...(props.body.ip && { ip: props.body.ip }),
    ...(props.body.created_at_from && {
      created_at: {
        gte: new Date(props.body.created_at_from),
      },
    }),
    ...(props.body.created_at_to && {
      created_at: {
        lte: new Date(props.body.created_at_to),
      },
    }),
    ...(props.body.expired !== undefined && {
      expired_at: props.body.expired ? { lt: new Date() } : { gte: new Date() },
    }),
    guest: {
      deleted_at: null,
    },
  } satisfies Prisma.discussion_board_guest_sessionsWhereInput;
  const orderByInput: Prisma.discussion_board_guest_sessionsOrderByWithRelationInput =
    props.body.sort_by === "created_at"
      ? { created_at: props.body.order ?? "desc" }
      : props.body.sort_by === "expired_at"
        ? { expired_at: props.body.order ?? "desc" }
        : props.body.sort_by === "ip"
          ? { ip: props.body.order ?? "desc" }
          : { created_at: "desc" as const };
  const sessions =
    await MyGlobal.prisma.discussion_board_guest_sessions.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      include: {
        guest: {
          select: {
            id: true,
            device_fingerprint: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    });
  const total = await MyGlobal.prisma.discussion_board_guest_sessions.count({
    where: whereInput,
  });
  const data = sessions.map(
    (session) =>
      ({
        id: session.id as string & tags.Format<"uuid">,
        type: "guest" as const,
        ip: session.ip as string & tags.Format<"ipv4">,
        href: session.href as string & tags.Format<"uri">,
        referrer: session.referrer
          ? (session.referrer as string & tags.Format<"uri">)
          : null,
        user: {
          id: session.guest.id as string & tags.Format<"uuid">,
          displayName: session.guest.device_fingerprint,
          bio: null,
          articleCount: 0,
          commentCount: 0,
          createdAt: toISOStringSafe(session.guest.created_at),
          updatedAt: toISOStringSafe(session.guest.updated_at),
          deletedAt: session.guest.deleted_at
            ? toISOStringSafe(session.guest.deleted_at)
            : null,
        } satisfies IDiscussionBoardMember.ISummary,
        created_at: toISOStringSafe(session.created_at),
        expired_at: toISOStringSafe(session.expired_at),
      }) satisfies IDiscussionBoardGuestSession.ISummary,
  );
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIDiscussionBoardGuestSession.ISummary;
}
