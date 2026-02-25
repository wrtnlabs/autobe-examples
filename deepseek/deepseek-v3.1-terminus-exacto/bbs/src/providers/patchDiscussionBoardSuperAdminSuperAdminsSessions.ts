import { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdminSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { IPageIDiscussionBoardSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSuperAdminSession";
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

export async function patchDiscussionBoardSuperAdminSuperAdminsSessions(props: {
  superAdmin: SuperAdminPayload;
  body: IDiscussionBoardSuperAdminSession.IRequest;
}): Promise<IPageIDiscussionBoardSuperAdminSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause with proper date handling
  const whereInput = {
    ...(props.body.super_admin_id && {
      discussion_board_super_admin_id: props.body.super_admin_id,
    }),
    ...(props.body.ip && { ip: { contains: props.body.ip } }),
    ...(props.body.expired_at_before && {
      expired_at: { lte: new Date(props.body.expired_at_before) },
    }),
    ...(props.body.expired_at_after && {
      expired_at: { gte: new Date(props.body.expired_at_after) },
    }),
    ...(props.body.created_at_before && {
      created_at: { lte: new Date(props.body.created_at_before) },
    }),
    ...(props.body.created_at_after && {
      created_at: { gte: new Date(props.body.created_at_after) },
    }),
  } satisfies Prisma.discussion_board_super_admin_sessionsWhereInput;
  const data =
    await MyGlobal.prisma.discussion_board_super_admin_sessions.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        ip: true,
        expired_at: true,
        created_at: true,
      },
    });
  const total =
    await MyGlobal.prisma.discussion_board_super_admin_sessions.count({
      where: whereInput,
    });
  const pages = Math.ceil(total / limit);
  // Transform sessions to match the expected ISummary structure
  const transformedData = data.map((session) => ({
    id: session.id satisfies string & tags.Format<"uuid">,
    ip: session.ip satisfies string & tags.Format<"ipv4">,
    expired_at: toISOStringSafe(session.expired_at) satisfies string &
      tags.Format<"date-time">,
    created_at: toISOStringSafe(session.created_at) satisfies string &
      tags.Format<"date-time">,
  }));
  // Create pagination structure matching the nested DTO hierarchy
  const paginationStructure = {
    pagination: {
      pagination: {
        pagination: {
          current: page satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
          limit: limit satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
          records: total satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<0>,
          pages: pages satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
        } satisfies IPage.IPagination,
        data: [], // Empty array for IDiscussionBoardAdministratorDistributionStatistic.IPagination[]
      } satisfies IPageIDiscussionBoardAdministratorDistributionStatistic.IPagination,
      data: [], // Empty array for IDiscussionBoardAdministratorPromotionRequest.IPagination[]
    } satisfies IPageIDiscussionBoardAdministratorPromotionRequest.IPagination,
    data: [], // Empty array for IDiscussionBoardSection.IPagination[]
  } satisfies IPageIDiscussionBoardSection.IPagination;
  return {
    data: transformedData,
    pagination: paginationStructure,
  } satisfies IPageIDiscussionBoardSuperAdminSession.ISummary;
}
