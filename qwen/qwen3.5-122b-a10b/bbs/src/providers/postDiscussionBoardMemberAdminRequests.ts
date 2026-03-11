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
  // Validate reason is non-empty after trimming
  const trimmedReason = props.body.reason.trim();
  if (trimmedReason.length === 0) {
    throw new HttpException("Reason cannot be empty", 400);
  }
  // Check for existing pending request by this member
  const existingRequest =
    await MyGlobal.prisma.discussion_board_admin_requests.findFirst({
      where: {
        discussion_board_member_id: props.member.id,
        status: "pending",
        deleted_at: null,
      },
    });
  if (existingRequest !== null) {
    throw new HttpException(
      "You already have a pending administrator request",
      409,
    );
  }
  // Create the request using collector
  const memberEntity: IEntity = { id: props.member.id } satisfies IEntity;
  const created = await MyGlobal.prisma.discussion_board_admin_requests.create({
    data: await DiscussionBoardAdminRequestCollector.collect({
      body: { reason: trimmedReason },
      discussionBoardMembers: memberEntity,
    }),
    ...DiscussionBoardAdminRequestTransformer.select(),
  });
  return await DiscussionBoardAdminRequestTransformer.transform(created);
}
