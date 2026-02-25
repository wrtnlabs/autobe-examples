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
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchDiscussionBoardSuperAdminSystemAnalyticsSecurity(props: {
  superAdmin: SuperAdminPayload;
  body: IDiscussionBoardSecurityEvent.IRequest;
}): Promise<IPageIDiscussionBoardSecurityEvent.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE conditions for filtering
  const whereInput: Prisma.discussion_board_security_eventsWhereInput = {
    ...(props.body.event_type && { event_type: props.body.event_type }),
    ...(props.body.severity && { severity: props.body.severity }),
    ...(props.body.resolved !== undefined && { resolved: props.body.resolved }),
    ...(props.body.user_id !== undefined && { user_id: props.body.user_id }),
    ...(props.body.admin_id !== undefined && { admin_id: props.body.admin_id }),
    ...(props.body.super_admin_id !== undefined && {
      super_admin_id: props.body.super_admin_id,
    }),
    ...(props.body.search && {
      description: {
        contains: props.body.search,
        mode: "insensitive" as const,
      },
    }),
  };
  // Add date range filtering - must convert string to Date for Prisma
  if (props.body.created_at_start && props.body.created_at_end) {
    whereInput.created_at = {
      gte: new Date(props.body.created_at_start),
      lte: new Date(props.body.created_at_end),
    } satisfies Prisma.DateTimeFilter;
  } else if (props.body.created_at_start) {
    whereInput.created_at = {
      gte: new Date(props.body.created_at_start),
    } satisfies Prisma.DateTimeFilter;
  } else if (props.body.created_at_end) {
    whereInput.created_at = {
      lte: new Date(props.body.created_at_end),
    } satisfies Prisma.DateTimeFilter;
  }
  // Query security events with related actor joins
  const data = await MyGlobal.prisma.discussion_board_security_events.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    include: {
      user: {
        select: {
          id: true,
          display_name: true,
          bio: true,
          created_at: true,
        },
      } satisfies Prisma.discussion_board_usersFindManyArgs,
      admin: {
        select: {
          id: true,
          email: true,
          display_name: true,
          created_at: true,
        },
      } satisfies Prisma.discussion_board_adminsFindManyArgs,
      superAdmin: {
        select: {
          id: true,
          email: true,
          created_at: true,
        },
      } satisfies Prisma.discussion_board_super_adminsFindManyArgs,
    },
  });
  // Count total records for pagination
  const total = await MyGlobal.prisma.discussion_board_security_events.count({
    where: whereInput,
  });
  // Transform database results to API response format
  const transformedData: IDiscussionBoardSecurityEvent.ISummary[] = data.map(
    (event) => ({
      id: event.id,
      event_type: event.event_type,
      severity: event.severity,
      description: event.description,
      source_ip: event.source_ip,
      resolved: event.resolved,
      created_at: toISOStringSafe(event.created_at),
      user: event.user
        ? ({
            id: event.user.id,
            display_name: event.user.display_name,
            bio: event.user.bio ?? null,
            created_at: toISOStringSafe(event.user.created_at),
          } satisfies IDiscussionBoardUser.ISummary)
        : null,
      admin: event.admin
        ? ({
            id: event.admin.id,
            email: event.admin.email,
            display_name: event.admin.display_name,
            created_at: toISOStringSafe(event.admin.created_at),
          } satisfies IDiscussionBoardAdmin.ISummary)
        : null,
      superAdmin: event.superAdmin
        ? ({
            id: event.superAdmin.id,
            permission_level: "super_admin" as const,
            assignment_date: toISOStringSafe(event.superAdmin.created_at),
            admin: null,
            superAdmin: null,
          } satisfies IDiscussionBoardSuperAdmin.ISummary)
        : null,
    }),
  );
  // Create nested pagination structure
  const innerPagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  };
  const level1Pagination: IPageIDiscussionBoardAdministratorDistributionStatistic.IPagination =
    {
      pagination: innerPagination,
      data: [],
    };
  const level2Pagination: IPageIDiscussionBoardAdministratorPromotionRequest.IPagination =
    {
      pagination: level1Pagination,
      data: [],
    };
  const level3Pagination: IPageIDiscussionBoardSection.IPagination = {
    pagination: level2Pagination,
    data: [],
  };
  return {
    data: transformedData,
    pagination: level3Pagination,
  };
}
