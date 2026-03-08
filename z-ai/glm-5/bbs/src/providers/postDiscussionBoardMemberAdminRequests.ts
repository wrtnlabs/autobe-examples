import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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
  // Check if member is already an admin
  const existingAdmin = await MyGlobal.prisma.discussion_board_admins.findFirst(
    {
      where: {
        id: props.member.id,
        banned_at: null,
      },
    },
  );
  if (existingAdmin !== null) {
    throw new HttpException("User is already an administrator", 403);
  }
  // Check for existing pending request
  const existingRequest =
    await MyGlobal.prisma.discussion_board_admin_requests.findFirst({
      where: {
        member_id: props.member.id,
        status: "pending",
        deleted_at: null,
      },
    });
  if (existingRequest !== null) {
    throw new HttpException(
      "Member already has a pending administrator request",
      409,
    );
  }
  // Create request using collector
  const created = await MyGlobal.prisma.discussion_board_admin_requests.create({
    data: await DiscussionBoardAdminRequestCollector.collect({
      body: props.body,
      discussionBoardMembers: { id: props.member.id },
    }),
    ...DiscussionBoardAdminRequestTransformer.select(),
  });
  return await DiscussionBoardAdminRequestTransformer.transform(created);
}
