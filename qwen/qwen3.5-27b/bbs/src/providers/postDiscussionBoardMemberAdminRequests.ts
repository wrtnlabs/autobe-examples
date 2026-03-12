import { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import { IDiscussionBoardAdminRequestDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequestDecision";
import { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardAdminRequestCollector } from "../collectors/DiscussionBoardAdminRequestCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { DiscussionBoardAdminRequestTransformer } from "../transformers/DiscussionBoardAdminRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardMemberAdminRequests(props: {
  member: MemberPayload;
  body: IDiscussionBoardAdminRequest.ICreate;
}): Promise<IDiscussionBoardAdminRequest> {
  // Check if member is banned
  const member = await MyGlobal.prisma.discussion_board_members.findUnique({
    where: { id: props.member.id },
    select: { id: true, banned: true },
  });
  if (member?.banned) {
    throw new HttpException("You are banned", 403);
  }
  // Check if member already has a pending request
  const existingRequest =
    await MyGlobal.prisma.discussion_board_admin_requests.findFirst({
      where: {
        discussion_board_member_id: props.member.id,
        status: "pending",
        deleted_at: null,
      },
    });
  if (existingRequest) {
    throw new HttpException("You already have a pending admin request", 409);
  }
  // Validate reason is not empty
  if (!props.body.reason || props.body.reason.trim().length === 0) {
    throw new HttpException("Reason is required", 400);
  }
  // Create the admin request
  const created = await MyGlobal.prisma.discussion_board_admin_requests.create({
    data: await DiscussionBoardAdminRequestCollector.collect({
      body: props.body,
      discussionBoardMembers: { id: props.member.id },
    }),
    ...DiscussionBoardAdminRequestTransformer.select(),
  });
  return await DiscussionBoardAdminRequestTransformer.transform(created);
}
