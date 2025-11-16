import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAdminuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuserSession";
import { IPageIDiscussionBoardAdminuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminuserSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function patchDiscussionBoardAdminUserAdminUsersAdminUserIdSessions(props: {
  adminUser: AdminuserPayload;
  adminUserId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAdminuserSession.IRequest;
}): Promise<IPageIDiscussionBoardAdminuserSession.ISummary> {
  // Ensure the authenticated admin can only query their own sessions
  if (props.adminUser.id !== props.adminUserId) {
    throw new HttpException(
      "Forbidden to access other admin user's sessions",
      403,
    );
  }

  const pageInput = props.body.page;
  const limitInput = props.body.limit;

  const defaultPage = 1 as number & tags.Type<"int32">;
  const defaultLimit = 10 as number & tags.Type<"int32">;

  const page: number & tags.Type<"int32"> & tags.Minimum<0> =
    pageInput !== undefined && pageInput !== null && pageInput >= 1
      ? (pageInput as number & tags.Type<"int32"> & tags.Minimum<0>)
      : (defaultPage as number & tags.Type<"int32"> & tags.Minimum<0>);

  const limit: number & tags.Type<"int32"> & tags.Minimum<0> =
    limitInput !== undefined && limitInput !== null && limitInput > 0
      ? (limitInput as number & tags.Type<"int32"> & tags.Minimum<0>)
      : (defaultLimit as number & tags.Type<"int32"> & tags.Minimum<0>);

  const skip = (page - 1) * limit;

  // Build Prisma where condition with mandatory admin scope and optional filters
  const where: Prisma.discussion_board_adminuser_sessionsWhereInput = {
    discussion_board_adminuser_id: props.adminUserId,
    ...(props.body.from_created_at !== undefined &&
    props.body.from_created_at !== null
      ? {
          created_at: {
            gte: props.body.from_created_at,
            ...(props.body.to_created_at !== undefined &&
            props.body.to_created_at !== null
              ? { lt: props.body.to_created_at }
              : {}),
          },
        }
      : props.body.to_created_at !== undefined &&
          props.body.to_created_at !== null
        ? {
            created_at: {
              lt: props.body.to_created_at,
            },
          }
        : {}),
    ...(props.body.ip !== undefined && props.body.ip !== null
      ? { ip: props.body.ip }
      : {}),
    ...(props.body.href !== undefined && props.body.href !== null
      ? { href: props.body.href }
      : {}),
    ...(props.body.referrer !== undefined && props.body.referrer !== null
      ? { referrer: props.body.referrer }
      : {}),
  };

  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_adminuser_sessions.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        created_at: "desc",
      },
    }),
    MyGlobal.prisma.discussion_board_adminuser_sessions.count({
      where,
    }),
  ]);

  // Fetch all related admin users in a single query to avoid N+1
  const adminIds = Array.from(
    new Set(sessions.map((session) => session.discussion_board_adminuser_id)),
  );

  const adminUsers = await MyGlobal.prisma.discussion_board_adminusers.findMany(
    {
      where: {
        id: {
          in: adminIds,
        },
      },
    },
  );

  const adminMap = new Map<string, (typeof adminUsers)[number]>();
  for (const admin of adminUsers) adminMap.set(admin.id, admin);

  const data: IDiscussionBoardAdminuserSession.ISummary[] = sessions.map(
    (session) => {
      const admin = adminMap.get(session.discussion_board_adminuser_id);

      if (!admin) {
        throw new HttpException("Admin user not found for session", 500);
      }

      const adminSummary: IDiscussionBoardAdminuser.ISummary = {
        id: admin.id,
        email: admin.email,
        display_name: admin.display_name,
        // profile_image_url column does not exist in the Prisma model; DTO field is optional,
        // so we safely return undefined here.
        profile_image_url: undefined,
        email_verified: admin.email_verified,
        account_status: admin.account_status,
        created_at: toISOStringSafe(admin.created_at),
        last_login_at:
          admin.last_login_at !== null && admin.last_login_at !== undefined
            ? toISOStringSafe(admin.last_login_at)
            : undefined,
      };

      const summary: IDiscussionBoardAdminuserSession.ISummary = {
        id: session.id,
        discussion_board_adminuser_id: session.discussion_board_adminuser_id,
        created_at: toISOStringSafe(session.created_at),
        expired_at:
          session.expired_at !== null && session.expired_at !== undefined
            ? toISOStringSafe(session.expired_at)
            : undefined,
        ip: session.ip,
        href: session.href,
        referrer: session.referrer,
        adminUser: adminSummary,
      };

      return summary;
    },
  );

  const records = total;
  const effectiveLimit = limit;

  const pagesRaw =
    effectiveLimit === 0
      ? 0
      : records === 0
        ? 0
        : Math.ceil(records / effectiveLimit);

  const pagination: IPage.IPagination = {
    current: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
      page - 1,
    ),
    limit: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
      effectiveLimit,
    ),
    records: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
      records,
    ),
    pages: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
      pagesRaw,
    ),
  };

  return {
    pagination,
    data,
  };
}
