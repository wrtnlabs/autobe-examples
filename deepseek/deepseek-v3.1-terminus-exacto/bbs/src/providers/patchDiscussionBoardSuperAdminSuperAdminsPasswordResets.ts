import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IDiscussionBoardSuperAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdminPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { IPageIDiscussionBoardSuperAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSuperAdminPasswordReset";
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
export async function patchDiscussionBoardSuperAdminSuperAdminsPasswordResets(props: {
  superAdmin: SuperAdminPayload;
  body: IDiscussionBoardSuperAdminPasswordReset.IRequest;
}): Promise<IPageIDiscussionBoardSuperAdminPasswordReset.ISummary> {
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.min(100, Math.max(1, props.body.limit ?? 100));
  const skip = (page - 1) * limit;
  if (limit === 0) {
    return {
      pagination: {
        current: page,
        limit: 0,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
      data: [],
    } satisfies IPageIDiscussionBoardSuperAdminPasswordReset.ISummary;
  }
  const whereInput: Prisma.discussion_board_super_admin_password_resetsWhereInput =
    {};
  if (props.body.super_admin_id) {
    whereInput.discussion_board_super_admin_id = props.body.super_admin_id;
  }
  if (props.body.used !== undefined) {
    if (props.body.used === true) {
      whereInput.used_at = { not: null };
    } else if (props.body.used === false) {
      whereInput.used_at = null;
    }
  }
  if (props.body.expired !== undefined) {
    const now = new Date();
    const currentTime = now.toISOString();
    if (props.body.expired === true) {
      whereInput.expired_at = { lt: currentTime };
    } else {
      whereInput.expired_at = { gte: currentTime };
    }
  }
  if (props.body.created_at_start) {
    whereInput.created_at = { gte: props.body.created_at_start };
  }
  if (props.body.created_at_end) {
    const existingCreatedAt = whereInput.created_at as
      | Prisma.DateTimeFilter
      | undefined;
    whereInput.created_at = existingCreatedAt
      ? { gte: existingCreatedAt.gte, lte: props.body.created_at_end }
      : { lte: props.body.created_at_end };
  }
  if (props.body.updated_at_start) {
    whereInput.updated_at = { gte: props.body.updated_at_start };
  }
  if (props.body.updated_at_end) {
    const existingUpdatedAt = whereInput.updated_at as
      | Prisma.DateTimeFilter
      | undefined;
    whereInput.updated_at = existingUpdatedAt
      ? { gte: existingUpdatedAt.gte, lte: props.body.updated_at_end }
      : { lte: props.body.updated_at_end };
  }
  const orderByInput: Prisma.discussion_board_super_admin_password_resetsOrderByWithRelationInput =
    props.body.sort === "created_at_asc"
      ? { created_at: "asc" }
      : props.body.sort === "updated_at_desc"
        ? { updated_at: "desc" }
        : props.body.sort === "updated_at_asc"
          ? { updated_at: "asc" }
          : { created_at: "desc" };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_super_admin_password_resets.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      select: {
        id: true,
        token: true,
        expired_at: true,
        used_at: true,
        created_at: true,
        superAdmin: {
          select: {
            id: true,
            email: true,
            privilege_level: true,
            created_at: true,
          },
        },
      },
    }),
    MyGlobal.prisma.discussion_board_super_admin_password_resets.count({
      where: whereInput,
    }),
  ]);
  const transformedData = data.map(
    (item) =>
      ({
        id: item.id,
        token: item.token,
        super_admin: {
          id: item.superAdmin.id,
          permission_level: item.superAdmin.privilege_level,
          assignment_date: item.superAdmin.created_at.toISOString(),
          admin: null,
          superAdmin: null,
        } satisfies IDiscussionBoardSuperAdmin.ISummary,
        expired_at: item.expired_at.toISOString(),
        used_at: item.used_at ? item.used_at.toISOString() : null,
        created_at: item.created_at.toISOString(),
      }) satisfies IDiscussionBoardSuperAdminPasswordReset.ISummary,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total > 0 ? Math.ceil(total / limit) : 0,
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIDiscussionBoardSuperAdminPasswordReset.ISummary;
}
