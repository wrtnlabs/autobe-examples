import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminPromotionRequests(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardAdministratorPromotionRequest.IRequest;
}): Promise<IPageIDiscussionBoardAdministratorPromotionRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build comprehensive where clause with proper search patterns
  const whereInput: Prisma.discussion_board_administrator_promotion_requestsWhereInput =
    {
      AND: [
        props.body.status ? { status: props.body.status } : undefined,
        props.body.created_at_start
          ? { created_at: { gte: props.body.created_at_start } }
          : undefined,
        props.body.created_at_end
          ? { created_at: { lte: props.body.created_at_end } }
          : undefined,
        props.body.approved_at_start
          ? { approved_at: { gte: props.body.approved_at_start } }
          : undefined,
        props.body.approved_at_end
          ? { approved_at: { lte: props.body.approved_at_end } }
          : undefined,
        props.body.rejected_at_start
          ? { rejected_at: { gte: props.body.rejected_at_start } }
          : undefined,
        props.body.rejected_at_end
          ? { rejected_at: { lte: props.body.rejected_at_end } }
          : undefined,
        props.body.reviewer_super_admin_id
          ? {
              reviewer_discussion_board_super_admin_id:
                props.body.reviewer_super_admin_id,
            }
          : undefined,
        props.body.reason_search
          ? {
              reason: {
                contains: props.body.reason_search,
                mode: "insensitive" as const,
              },
            }
          : undefined,
        props.body.user_display_name
          ? {
              user: {
                display_name: {
                  contains: props.body.user_display_name,
                  mode: "insensitive" as const,
                },
              },
            }
          : undefined,
        props.body.user_email
          ? {
              user: {
                email: {
                  contains: props.body.user_email,
                  mode: "insensitive" as const,
                },
              },
            }
          : undefined,
      ].filter(
        Boolean,
      ) as Prisma.discussion_board_administrator_promotion_requestsWhereInput[],
    };
  // Execute queries sequentially as required
  const data =
    await MyGlobal.prisma.discussion_board_administrator_promotion_requests.findMany(
      {
        where: whereInput,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          reason: true,
          status: true,
          approved_at: true,
          rejected_at: true,
          created_at: true,
          updated_at: true,
          discussion_board_user_id: true,
          reviewer_discussion_board_super_admin_id: true,
        },
      },
    );
  const total =
    await MyGlobal.prisma.discussion_board_administrator_promotion_requests.count(
      {
        where: whereInput,
      },
    );
  // Fetch related user and reviewer data separately
  const userIds = data.map((item) => item.discussion_board_user_id);
  const reviewerIds = data
    .map((item) => item.reviewer_discussion_board_super_admin_id)
    .filter((id): id is string => id !== null);
  const users = await MyGlobal.prisma.discussion_board_users.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      display_name: true,
      bio: true,
      created_at: true,
      updated_at: true,
    },
  });
  const reviewers =
    reviewerIds.length > 0
      ? await MyGlobal.prisma.discussion_board_super_admins.findMany({
          where: { id: { in: reviewerIds } },
          select: {
            id: true,
            email: true,
            privilege_level: true,
            created_at: true,
          },
        })
      : [];
  const userMap = new Map(users.map((user) => [user.id, user]));
  const reviewerMap = new Map(
    reviewers.map((reviewer) => [reviewer.id, reviewer]),
  );
  // Transform to ISummary format
  const transformedData = data.map((item) => {
    const user = userMap.get(item.discussion_board_user_id);
    const reviewer = item.reviewer_discussion_board_super_admin_id
      ? reviewerMap.get(item.reviewer_discussion_board_super_admin_id)
      : null;
    return {
      id: item.id as string & tags.Format<"uuid">,
      reason: item.reason,
      status: item.status as "pending" | "approved" | "rejected",
      user: {
        id: user!.id as string & tags.Format<"uuid">,
        display_name: user!.display_name,
        bio: user!.bio,
        created_at: toISOStringSafe(user!.created_at),
        updated_at: toISOStringSafe(user!.updated_at),
      },
      reviewer: reviewer
        ? {
            id: reviewer.id as string & tags.Format<"uuid">,
            email: reviewer.email,
            privilege_level: reviewer.privilege_level,
            created_at: toISOStringSafe(reviewer.created_at),
          }
        : null,
      approved_at: item.approved_at ? toISOStringSafe(item.approved_at) : null,
      rejected_at: item.rejected_at ? toISOStringSafe(item.rejected_at) : null,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
    };
  });
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
