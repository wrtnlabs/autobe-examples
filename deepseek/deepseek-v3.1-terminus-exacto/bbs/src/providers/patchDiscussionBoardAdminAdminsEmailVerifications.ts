import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdminEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminEmailVerification";
import { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdminEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminEmailVerification";
import { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
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

export async function patchDiscussionBoardAdminAdminsEmailVerifications(props: {
  admin: AdminPayload;
  body: IDiscussionBoardAdminEmailVerification.IRequest;
}): Promise<IPageIDiscussionBoardAdminEmailVerification> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.discussion_board_admin_email_verificationsWhereInput =
    {
      ...(props.body.administrator_id !== undefined &&
        props.body.administrator_id !== null && {
          discussion_board_admin_id: props.body.administrator_id,
        }),
      ...(props.body.email !== undefined &&
        props.body.email !== null && { email: props.body.email }),
      ...(props.body.token !== undefined &&
        props.body.token !== null && { token: { contains: props.body.token } }),
      ...(props.body.verified !== undefined &&
        props.body.verified !== null &&
        (props.body.verified === true
          ? { verified_at: { not: null } }
          : { verified_at: null })),
      ...(props.body.created_at_from !== undefined &&
        props.body.created_at_from !== null && {
          created_at: { gte: new Date(props.body.created_at_from) },
        }),
      ...(props.body.created_at_to !== undefined &&
        props.body.created_at_to !== null && {
          created_at: { lte: new Date(props.body.created_at_to) },
        }),
      ...(props.body.expired_at_from !== undefined &&
        props.body.expired_at_from !== null && {
          expired_at: { gte: new Date(props.body.expired_at_from) },
        }),
      ...(props.body.expired_at_to !== undefined &&
        props.body.expired_at_to !== null && {
          expired_at: { lte: new Date(props.body.expired_at_to) },
        }),
      ...(props.body.verified_at_from !== undefined &&
        props.body.verified_at_from !== null && {
          verified_at: { gte: new Date(props.body.verified_at_from) },
        }),
      ...(props.body.verified_at_to !== undefined &&
        props.body.verified_at_to !== null && {
          verified_at: { lte: new Date(props.body.verified_at_to) },
        }),
    };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_admin_email_verifications.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      include: {
        admin: {
          select: {
            id: true,
            email: true,
            display_name: true,
            created_at: true,
          },
        },
      },
    }),
    MyGlobal.prisma.discussion_board_admin_email_verifications.count({
      where: whereInput,
    }),
  ]);
  const transformedData: IDiscussionBoardAdminEmailVerification[] = data.map(
    (item) => ({
      id: item.id as string & tags.Format<"uuid">,
      token: item.token,
      email: item.email as string & tags.Format<"email">,
      expired_at: toISOStringSafe(item.expired_at) as string &
        tags.Format<"date-time">,
      verified_at: item.verified_at
        ? (toISOStringSafe(item.verified_at) as string &
            tags.Format<"date-time">)
        : null,
      created_at: toISOStringSafe(item.created_at) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(item.updated_at) as string &
        tags.Format<"date-time">,
      discussion_board_admin_id: item.discussion_board_admin_id as string &
        tags.Format<"uuid">,
      admin: {
        id: item.admin.id as string & tags.Format<"uuid">,
        email: item.admin.email as string & tags.Format<"email">,
        display_name: item.admin.display_name,
        created_at: toISOStringSafe(item.admin.created_at) as string &
          tags.Format<"date-time">,
      } satisfies IDiscussionBoardAdmin.ISummary,
    }),
  );
  // Build correct nested pagination structure
  const deepestPagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  };
  const level3Pagination: IPageIDiscussionBoardAdministratorDistributionStatistic.IPagination =
    {
      pagination: deepestPagination,
      data: [] as IDiscussionBoardAdministratorDistributionStatistic.IPagination[],
    };
  const level2Pagination: IPageIDiscussionBoardAdministratorPromotionRequest.IPagination =
    {
      pagination: level3Pagination,
      data: [] as IDiscussionBoardAdministratorPromotionRequest.IPagination[],
    };
  const level1Pagination: IPageIDiscussionBoardSection.IPagination = {
    pagination: level2Pagination,
    data: [] as IDiscussionBoardSection.IPagination[],
  };
  return {
    data: transformedData,
    pagination: level1Pagination,
  };
}
