import { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardSuperAdminEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdminEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { IPageIDiscussionBoardSuperAdminEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSuperAdminEmailVerification";
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

export async function patchDiscussionBoardSuperAdminSuperAdminsEmailVerifications(props: {
  superAdmin: SuperAdminPayload;
  body: IDiscussionBoardSuperAdminEmailVerification.IRequest;
}): Promise<IPageIDiscussionBoardSuperAdminEmailVerification.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = Math.max(0, (page - 1) * limit);
  const filterConditions: Prisma.discussion_board_super_admin_email_verificationsWhereInput[] =
    [];
  if (props.body.verification_status === "pending") {
    filterConditions.push({ verified_at: null });
  } else if (props.body.verification_status === "completed") {
    filterConditions.push({ verified_at: { not: null } });
  }
  if (
    props.body.created_at_start !== undefined &&
    props.body.created_at_start !== null
  ) {
    filterConditions.push({ created_at: { gte: props.body.created_at_start } });
  }
  if (
    props.body.created_at_end !== undefined &&
    props.body.created_at_end !== null
  ) {
    filterConditions.push({ created_at: { lte: props.body.created_at_end } });
  }
  if (
    props.body.expired_at_start !== undefined &&
    props.body.expired_at_start !== null
  ) {
    filterConditions.push({ expired_at: { gte: props.body.expired_at_start } });
  }
  if (
    props.body.expired_at_end !== undefined &&
    props.body.expired_at_end !== null
  ) {
    filterConditions.push({ expired_at: { lte: props.body.expired_at_end } });
  }
  if (
    props.body.super_admin_id !== undefined &&
    props.body.super_admin_id !== null
  ) {
    filterConditions.push({
      discussion_board_super_admin_id: props.body.super_admin_id,
    });
  }
  if (props.body.search !== undefined && props.body.search !== null) {
    filterConditions.push({
      OR: [
        {
          token_hash: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        },
        {
          superAdmin: {
            email: {
              contains: props.body.search,
              mode: "insensitive" as const,
            },
          },
        },
      ],
    });
  }
  const whereClause: Prisma.discussion_board_super_admin_email_verificationsWhereInput =
    filterConditions.length > 0 ? { AND: filterConditions } : {};
  const records =
    await MyGlobal.prisma.discussion_board_super_admin_email_verifications.findMany(
      {
        where: whereClause,
        skip,
        take: limit,
        orderBy: { created_at: "desc" as const },
        include: {
          superAdmin: {
            select: { email: true },
          },
        },
      },
    );
  const total =
    await MyGlobal.prisma.discussion_board_super_admin_email_verifications.count(
      {
        where: whereClause,
      },
    );
  const transformedRecords: IDiscussionBoardSuperAdminEmailVerification.ISummary[] =
    records.map((record) => {
      const verificationStatus: "pending" | "completed" =
        record.verified_at === null ? "pending" : "completed";
      return {
        id: record.id,
        super_admin_email: record.superAdmin.email,
        verification_status: verificationStatus,
        created_at: toISOStringSafe(record.created_at),
        expired_at: toISOStringSafe(record.expired_at),
        verified_at: record.verified_at
          ? toISOStringSafe(record.verified_at)
          : null,
      };
    });
  const totalPages = Math.ceil(total / limit);
  // Remove the problematic satisfies clause and use type assertion instead
  const basePagination = {
    current: page satisfies number as number,
    limit: limit satisfies number as number,
    records: total satisfies number as number,
    pages: totalPages satisfies number as number,
  };
  // Create the nested structure according to the actual DTO definitions
  const adminDistStatPagination: IPageIDiscussionBoardAdministratorDistributionStatistic.IPagination =
    {
      pagination: basePagination as IPage.IPagination,
      data: [],
    };
  const adminPromotionPagination: IPageIDiscussionBoardAdministratorPromotionRequest.IPagination =
    {
      pagination: adminDistStatPagination,
      data: [],
    };
  const sectionPagination: IPageIDiscussionBoardSection.IPagination = {
    pagination: adminPromotionPagination,
    data: [],
  };
  const result: IPageIDiscussionBoardSuperAdminEmailVerification.ISummary = {
    data: transformedRecords,
    pagination: sectionPagination,
  };
  return result;
}
