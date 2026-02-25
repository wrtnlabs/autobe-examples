import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionApproval";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardAdministratorPromotionApprovalCollector } from "../collectors/DiscussionBoardAdministratorPromotionApprovalCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardAdministratorPromotionApprovalTransformer } from "../transformers/DiscussionBoardAdministratorPromotionApprovalTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postDiscussionBoardUserPromotionRequests(props: {
  user: UserPayload;
  body: IDiscussionBoardAdministratorPromotionApproval.ICreate;
}): Promise<IDiscussionBoardAdministratorPromotionApproval> {
  const userId = props.user.id;
  // Check if user already has a pending promotion request
  const pendingRequest =
    await MyGlobal.prisma.discussion_board_administrator_promotion_requests.findFirst(
      {
        where: {
          discussion_board_user_id: userId,
          status: "pending",
        },
      },
    );
  if (pendingRequest) {
    throw new HttpException(
      "You already have a pending promotion request",
      400,
    );
  }
  // Check if user is already an administrator
  const existingAdmin =
    await MyGlobal.prisma.discussion_board_administrators.findUnique({
      where: { user_id: userId },
    });
  if (existingAdmin) {
    throw new HttpException("You are already an administrator", 400);
  }
  // Get user record for account age validation
  const userRecord =
    await MyGlobal.prisma.discussion_board_users.findUniqueOrThrow({
      where: { id: userId, deleted_at: null },
    });
  // Check account age (30 days minimum)
  const THIRTY_DAYS_IN_MS = 30 * 24 * 60 * 60 * 1000;
  const createdAtMs = new Date(userRecord.created_at).getTime();
  const thirtyDaysAgoMs = Date.now() - THIRTY_DAYS_IN_MS;
  if (createdAtMs > thirtyDaysAgoMs) {
    throw new HttpException(
      "Your account must be at least 30 days old to submit a promotion request",
      400,
    );
  }
  // Check for recent rejection (30 days waiting period)
  const recentRejection =
    await MyGlobal.prisma.discussion_board_administrator_promotion_requests.findFirst(
      {
        where: {
          discussion_board_user_id: userId,
          status: "rejected",
          rejected_at: {
            gte: new Date(Date.now() - THIRTY_DAYS_IN_MS),
          },
        },
      },
    );
  if (recentRejection) {
    throw new HttpException(
      "You must wait 30 days after rejection before submitting a new promotion request",
      400,
    );
  }
  // Check contributions (10 articles minimum, 50 comments minimum)
  const [articleCount, commentCount] = await Promise.all([
    MyGlobal.prisma.discussion_board_articles.count({
      where: { discussion_board_user_id: userId, deleted_at: null },
    }),
    MyGlobal.prisma.discussion_board_comments.count({
      where: { discussion_board_user_id: userId, deleted_at: null },
    }),
  ]);
  if (articleCount < 10) {
    throw new HttpException(
      "You must have at least 10 published articles to request administrator status",
      400,
    );
  }
  if (commentCount < 50) {
    throw new HttpException(
      "You must have at least 50 comments to request administrator status",
      400,
    );
  }
  // Create the promotion request using the collector
  const data =
    await DiscussionBoardAdministratorPromotionApprovalCollector.collect({
      body: props.body,
      user: { id: userId },
    });
  const created =
    await MyGlobal.prisma.discussion_board_administrator_promotion_requests.create(
      {
        data,
        ...DiscussionBoardAdministratorPromotionApprovalTransformer.select(),
      },
    );
  return DiscussionBoardAdministratorPromotionApprovalTransformer.transform(
    created,
  );
}
