import { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
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
  // Check member is not banned
  const member =
    await MyGlobal.prisma.discussion_board_members.findUniqueOrThrow({
      where: { id: props.member.id },
      select: { id: true, is_banned: true },
    });
  if (member.is_banned) {
    throw new HttpException(
      "Banned members cannot submit administrator requests",
      403,
    );
  }
  // Check for existing pending request
  const existingPending =
    await MyGlobal.prisma.discussion_board_admin_requests.findFirst({
      where: {
        discussion_board_member_id: props.member.id,
        status: "pending",
        deleted_at: null,
      },
      select: { id: true },
    });
  if (existingPending) {
    throw new HttpException(
      "You already have a pending administrator request",
      400,
    );
  }
  // Create new admin request
  const created = await MyGlobal.prisma.discussion_board_admin_requests.create({
    data: await DiscussionBoardAdminRequestCollector.collect({
      body: props.body,
      discussionBoardMembers: { id: props.member.id },
      discussionBoardMemberSessions: {
        id: props.member.session_id,
      },
    }),
    ...DiscussionBoardAdminRequestTransformer.select(),
  });
  return await DiscussionBoardAdminRequestTransformer.transform(created);
}
