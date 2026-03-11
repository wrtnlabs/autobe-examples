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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { DiscussionBoardAdminRequestTransformer } from "../transformers/DiscussionBoardAdminRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardMemberAdminRequestsAdminRequestId(props: {
  member: MemberPayload;
  adminRequestId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAdminRequest> {
  // Check if request exists and is not soft-deleted
  const request =
    await MyGlobal.prisma.discussion_board_admin_requests.findUnique({
      where: { id: props.adminRequestId, deleted_at: null },
      select: { discussion_board_member_id: true },
    });
  if (request === null) {
    throw new HttpException("Not Found", 404);
  }
  // Check if member is the owner of the request
  const isOwner = request.discussion_board_member_id === props.member.id;
  // Check if member is an admin (can view all requests)
  const isAdmin = await MyGlobal.prisma.discussion_board_admins.findFirst({
    where: { id: props.member.id, deleted_at: null },
  });
  if (!isOwner && !isAdmin) {
    throw new HttpException("Forbidden", 403);
  }
  // Get full request with relations using transformer
  const fullRequest =
    await MyGlobal.prisma.discussion_board_admin_requests.findUniqueOrThrow({
      where: { id: props.adminRequestId, deleted_at: null },
      ...DiscussionBoardAdminRequestTransformer.select(),
    });
  return await DiscussionBoardAdminRequestTransformer.transform(fullRequest);
}
