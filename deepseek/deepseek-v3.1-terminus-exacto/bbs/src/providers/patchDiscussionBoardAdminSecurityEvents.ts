import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSecurityEvent";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { IPageIDiscussionBoardSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSecurityEvent";
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

export async function patchDiscussionBoardAdminSecurityEvents(props: {
  admin: AdminPayload;
  body: IDiscussionBoardSecurityEvent.IRequest;
}): Promise<IPageIDiscussionBoardSecurityEvent.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereConditions: Prisma.discussion_board_security_eventsWhereInput[] =
    [];
  if (props.body.event_type !== undefined) {
    whereConditions.push({ event_type: props.body.event_type });
  }
  if (props.body.severity !== undefined) {
    whereConditions.push({ severity: props.body.severity });
  }
  if (props.body.resolved !== undefined) {
    whereConditions.push({ resolved: props.body.resolved });
  }
  if (props.body.user_id !== undefined) {
    whereConditions.push(
      props.body.user_id === null
        ? { user_id: null }
        : { user_id: props.body.user_id },
    );
  }
  if (props.body.admin_id !== undefined) {
    whereConditions.push(
      props.body.admin_id === null
        ? { admin_id: null }
        : { admin_id: props.body.admin_id },
    );
  }
  if (props.body.super_admin_id !== undefined) {
    whereConditions.push(
      props.body.super_admin_id === null
        ? { super_admin_id: null }
        : { super_admin_id: props.body.super_admin_id },
    );
  }
  if (props.body.search !== undefined && props.body.search.trim().length > 0) {
    whereConditions.push({
      description: {
        contains: props.body.search.trim(),
        mode: "insensitive" as const,
      },
    });
  }
  const dateFilter: Prisma.DateTimeFilter<"discussion_board_security_events"> =
    {};
  if (props.body.created_at_start !== undefined) {
    dateFilter.gte = new Date(props.body.created_at_start);
  }
  if (props.body.created_at_end !== undefined) {
    dateFilter.lte = new Date(props.body.created_at_end);
  }
  if (Object.keys(dateFilter).length > 0) {
    whereConditions.push({ created_at: dateFilter });
  }
  const whereInput = whereConditions.length > 0 ? { AND: whereConditions } : {};
  const data = await MyGlobal.prisma.discussion_board_security_events.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" as const },
    select: {
      id: true,
      event_type: true,
      severity: true,
      description: true,
      source_ip: true,
      resolved: true,
      created_at: true,
      user_id: true,
      admin_id: true,
      super_admin_id: true,
    },
  });
  const total = await MyGlobal.prisma.discussion_board_security_events.count({
    where: whereInput,
  });
  const transformedData: IDiscussionBoardSecurityEvent.ISummary[] = [];
  for (const event of data) {
    let user: IDiscussionBoardUser.ISummary | null = null;
    let admin: IDiscussionBoardAdmin.ISummary | null = null;
    let superAdmin: IDiscussionBoardSuperAdmin.ISummary | null = null;
    if (event.user_id) {
      const userData = await MyGlobal.prisma.discussion_board_users.findUnique({
        where: { id: event.user_id },
        select: {
          id: true,
          display_name: true,
          bio: true,
          created_at: true,
        },
      });
      if (userData) {
        user = {
          id: userData.id,
          display_name: userData.display_name,
          bio: userData.bio ?? null,
          created_at: toISOStringSafe(userData.created_at) as string &
            tags.Format<"date-time">,
        } satisfies IDiscussionBoardUser.ISummary;
      }
    }
    if (event.admin_id) {
      const adminData =
        await MyGlobal.prisma.discussion_board_admins.findUnique({
          where: { id: event.admin_id },
          select: {
            id: true,
            email: true,
            display_name: true,
            created_at: true,
          },
        });
      if (adminData) {
        admin = {
          id: adminData.id,
          email: adminData.email as string & tags.Format<"email">,
          display_name: adminData.display_name,
          created_at: toISOStringSafe(adminData.created_at) as string &
            tags.Format<"date-time">,
        } satisfies IDiscussionBoardAdmin.ISummary;
      }
    }
    if (event.super_admin_id) {
      const superAdminData =
        await MyGlobal.prisma.discussion_board_super_admins.findUnique({
          where: { id: event.super_admin_id },
          select: {
            id: true,
            email: true,
            created_at: true,
          },
        });
      if (superAdminData) {
        superAdmin = {
          id: superAdminData.id,
          email: superAdminData.email as string & tags.Format<"email">,
          created_at: toISOStringSafe(superAdminData.created_at) as string &
            tags.Format<"date-time">,
        } satisfies IDiscussionBoardSuperAdmin.ISummary;
      }
    }
    transformedData.push({
      id: event.id,
      event_type: event.event_type,
      severity: event.severity,
      description: event.description,
      source_ip: event.source_ip as string & tags.Format<"ipv4">,
      resolved: event.resolved,
      created_at: toISOStringSafe(event.created_at) as string &
        tags.Format<"date-time">,
      user,
      admin,
      superAdmin,
    });
  }
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit) || 1,
    } satisfies IPage.IPagination,
  };
}
