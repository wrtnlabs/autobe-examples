import { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardAdminRequestCollector } from "../collectors/DiscussionBoardAdminRequestCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardAdminRequestTransformer } from "../transformers/DiscussionBoardAdminRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardUserAdminRequests(props: {
  user: UserPayload;
  body: IDiscussionBoardAdminRequest.ICreate;
}): Promise<IDiscussionBoardAdminRequest> {
  // 1. Fetch user to check permission and ban status
  const user = await MyGlobal.prisma.discussion_board_users.findUniqueOrThrow({
    where: { id: props.user.id },
    select: {
      id: true,
      permission_level: true,
      is_banned: true,
    },
  });
  // 2. Validate user is not already an admin
  if (user.permission_level !== "MEMBER") {
    throw new HttpException("User is already an administrator", 403);
  }
  // 3. Validate user is not banned
  if (user.is_banned) {
    throw new HttpException("Banned users cannot submit admin requests", 403);
  }
  // 4. Check for existing pending request
  const existingPending =
    await MyGlobal.prisma.discussion_board_admin_requests.findFirst({
      where: {
        requester_id: props.user.id,
        status: "pending",
      },
    });
  if (existingPending !== null) {
    throw new HttpException("A pending admin request already exists", 409);
  }
  // 5. Create admin request using Collector
  const created = await MyGlobal.prisma.discussion_board_admin_requests.create({
    data: await DiscussionBoardAdminRequestCollector.collect({
      body: props.body,
      discussionBoardUsers: { id: props.user.id },
    }),
    ...DiscussionBoardAdminRequestTransformer.select(),
  });
  // 6. Transform and return
  return await DiscussionBoardAdminRequestTransformer.transform(created);
}
