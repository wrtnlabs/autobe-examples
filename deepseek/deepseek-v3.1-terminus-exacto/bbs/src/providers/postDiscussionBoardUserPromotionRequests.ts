import { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
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
import { DiscussionBoardAdministratorPromotionRequestCollector } from "../collectors/DiscussionBoardAdministratorPromotionRequestCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardAdministratorPromotionRequestTransformer } from "../transformers/DiscussionBoardAdministratorPromotionRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardUserPromotionRequests(props: {
  user: UserPayload;
  body: IDiscussionBoardAdministratorPromotionRequest.ICreate;
}): Promise<IDiscussionBoardAdministratorPromotionRequest> {
  // Validate user exists
  const user = await MyGlobal.prisma.discussion_board_users.findFirst({
    where: {
      id: props.user.id,
      deleted_at: null,
    },
  });
  if (!user) {
    throw new HttpException("User not found", 404);
  }
  // Check if user is already an administrator
  const existingAdmin =
    await MyGlobal.prisma.discussion_board_administrators.findFirst({
      where: {
        user_id: props.user.id,
        is_active: true,
      },
    });
  if (existingAdmin) {
    throw new HttpException("User is already an administrator", 400);
  }
  // Check for existing pending promotion requests
  const pendingRequest =
    await MyGlobal.prisma.discussion_board_administrator_promotion_requests.findFirst(
      {
        where: {
          discussion_board_user_id: props.user.id,
          status: "pending",
        },
      },
    );
  if (pendingRequest) {
    throw new HttpException(
      "User already has a pending promotion request",
      400,
    );
  }
  // Create the promotion request using collector
  const created =
    await MyGlobal.prisma.discussion_board_administrator_promotion_requests.create(
      {
        data: await DiscussionBoardAdministratorPromotionRequestCollector.collect(
          {
            body: props.body,
            discussionBoardUsers: { id: props.user.id },
            discussionBoardUserSessions: { id: props.user.session_id },
          },
        ),
        ...DiscussionBoardAdministratorPromotionRequestTransformer.select(),
      },
    );
  // Transform and return the response
  return await DiscussionBoardAdministratorPromotionRequestTransformer.transform(
    created,
  );
}
