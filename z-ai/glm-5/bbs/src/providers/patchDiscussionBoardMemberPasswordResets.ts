import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { DiscussionBoardAdminPasswordResetAtSummaryTransformer } from "../transformers/DiscussionBoardAdminPasswordResetAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardMemberPasswordResets(props: {
  member: MemberPayload;
  body: IDiscussionBoardAdminPasswordReset.IRequest;
}): Promise<IPageIDiscussionBoardAdminPasswordReset.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const now = new Date();
  // Helper to build admin where clause
  const buildAdminWhere =
    (): Prisma.discussion_board_admin_password_resetsWhereInput => {
      const conditions: Prisma.discussion_board_admin_password_resetsWhereInput[] =
        [];
      if (props.body.status === "expired") {
        conditions.push({ expired_at: { lt: now } });
      } else if (props.body.status === "active") {
        conditions.push({ expired_at: { gte: now } });
      }
      if (props.body.created_at_from) {
        conditions.push({
          created_at: { gte: new Date(props.body.created_at_from) },
        });
      }
      if (props.body.created_at_to) {
        conditions.push({
          created_at: { lte: new Date(props.body.created_at_to) },
        });
      }
      if (props.body.admin_id) {
        conditions.push({ discussion_board_admin_id: props.body.admin_id });
      }
      if (props.body.search) {
        conditions.push({
          admin: {
            OR: [
              { email: { contains: props.body.search, mode: "insensitive" } },
              {
                display_name: {
                  contains: props.body.search,
                  mode: "insensitive",
                },
              },
            ],
          },
        });
      }
      return conditions.length > 0 ? { AND: conditions } : {};
    };
  // Helper to build member where clause
  const buildMemberWhere =
    (): Prisma.discussion_board_member_password_resetsWhereInput => {
      const conditions: Prisma.discussion_board_member_password_resetsWhereInput[] =
        [];
      if (props.body.status === "expired") {
        conditions.push({ expired_at: { lt: now } });
      } else if (props.body.status === "active") {
        conditions.push({ expired_at: { gte: now } });
      }
      if (props.body.created_at_from) {
        conditions.push({
          created_at: { gte: new Date(props.body.created_at_from) },
        });
      }
      if (props.body.created_at_to) {
        conditions.push({
          created_at: { lte: new Date(props.body.created_at_to) },
        });
      }
      if (props.body.member_id) {
        conditions.push({ discussion_board_member_id: props.body.member_id });
      }
      if (props.body.search) {
        conditions.push({
          member: {
            OR: [
              { email: { contains: props.body.search, mode: "insensitive" } },
              {
                display_name: {
                  contains: props.body.search,
                  mode: "insensitive",
                },
              },
            ],
          },
        });
      }
      return conditions.length > 0 ? { AND: conditions } : {};
    };
  // Query member password resets only
  if (props.body.actorType === "member") {
    const [memberResets, total] = await Promise.all([
      MyGlobal.prisma.discussion_board_member_password_resets.findMany({
        where: buildMemberWhere(),
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          token: true,
          expired_at: true,
          created_at: true,
          member: {
            select: {
              id: true,
              email: true,
              display_name: true,
              banned: true,
              created_at: true,
            },
          },
        },
      }),
      MyGlobal.prisma.discussion_board_member_password_resets.count({
        where: buildMemberWhere(),
      }),
    ]);
    return {
      pagination: {
        current: page,
        limit: limit,
        records: total,
        pages: Math.ceil(total / limit),
      } satisfies IPage.IPagination,
      data: memberResets.map(
        (reset) =>
          ({
            id: reset.id,
            token: reset.token,
            expiredAt: reset.expired_at.toISOString(),
            createdAt: reset.created_at.toISOString(),
            admin: {
              id: reset.member.id,
              email: reset.member.email,
              displayName: reset.member.display_name,
              grade: "regular" as const,
              banned: reset.member.banned,
              createdAt: reset.member.created_at.toISOString(),
            } satisfies IDiscussionBoardAdmin.ISummary,
          }) satisfies IDiscussionBoardAdminPasswordReset.ISummary,
      ),
    };
  }
  // Query admin password resets (actorType === 'admin' or undefined/null)
  const [adminResets, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_admin_password_resets.findMany({
      where: buildAdminWhere(),
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { created_at: "desc" },
      ...DiscussionBoardAdminPasswordResetAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_admin_password_resets.count({
      where: buildAdminWhere(),
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      adminResets,
      DiscussionBoardAdminPasswordResetAtSummaryTransformer.transform,
    ),
  };
}
