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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchDiscussionBoardAdminSystemAnalyticsSecurity(props: {
  admin: AdminPayload;
  body: IDiscussionBoardSecurityEvent.IRequest;
}): Promise<IPageIDiscussionBoardSecurityEvent.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause without Date constructor
  const whereConditions: Prisma.discussion_board_security_eventsWhereInput[] =
    [];
  // Add filter conditions
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
    whereConditions.push({ user_id: props.body.user_id });
  }
  if (props.body.admin_id !== undefined) {
    whereConditions.push({ admin_id: props.body.admin_id });
  }
  if (props.body.super_admin_id !== undefined) {
    whereConditions.push({ super_admin_id: props.body.super_admin_id });
  }
  // Handle date range using Prisma's native date handling
  const dateConditions: Prisma.DateTimeFilter = {};
  if (props.body.created_at_start !== undefined) {
    dateConditions.gte = props.body.created_at_start;
  }
  if (props.body.created_at_end !== undefined) {
    dateConditions.lte = props.body.created_at_end;
  }
  if (Object.keys(dateConditions).length > 0) {
    whereConditions.push({ created_at: dateConditions });
  }
  if (props.body.search !== undefined) {
    whereConditions.push({
      description: {
        contains: props.body.search,
        mode: "insensitive" as const,
      },
    });
  }
  const whereInput = {
    AND: whereConditions.length > 0 ? whereConditions : undefined,
  } satisfies Prisma.discussion_board_security_eventsWhereInput;
  // Execute queries sequentially
  const data = await MyGlobal.prisma.discussion_board_security_events.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" as const },
  });
  const total = await MyGlobal.prisma.discussion_board_security_events.count({
    where: whereInput,
  });
  // Transform data manually since transformers are not available
  const transformedData = data.map((event) => ({
    id: event.id,
    event_type: event.event_type,
    severity: event.severity,
    description: event.description,
    source_ip: event.source_ip,
    resolved: event.resolved,
    created_at: event.created_at.toISOString(),
    user: null,
    admin: null,
    superAdmin: null,
  }));
  // Build pagination according to IPage.IPagination structure
  const paginationData: IPage.IPagination = {
    pagination: {
      pagination: {
        current: page satisfies number as number & tags.Minimum<0>,
        limit: limit satisfies number as number & tags.Minimum<0>,
        records: total satisfies number as number & tags.Minimum<0>,
        pages: Math.ceil(total / limit) satisfies number as number &
          tags.Minimum<0>,
      } satisfies IPage.IPagination,
    } satisfies IPageIDiscussionBoardAdministratorDistributionStatistic.IPagination,
  } satisfies IPageIDiscussionBoardAdministratorPromotionRequest.IPagination;
  return {
    pagination: paginationData,
    data: transformedData,
  };
}
