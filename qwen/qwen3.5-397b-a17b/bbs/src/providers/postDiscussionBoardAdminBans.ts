import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardBanCollector } from "../collectors/DiscussionBoardBanCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardBanTransformer } from "../transformers/DiscussionBoardBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdminBans(props: {
  admin: AdminPayload;
  body: IDiscussionBoardBan.ICreate;
}): Promise<IDiscussionBoardBan> {
  // Validate target member exists and is not deleted
  const member = await MyGlobal.prisma.discussion_board_members.findUnique({
    where: { id: props.body.member_id },
    select: { id: true, deleted_at: true },
  });
  if (!member) {
    throw new HttpException("Member not found", 404);
  }
  if (member.deleted_at !== null) {
    throw new HttpException("Member account is deleted", 400);
  }
  // Check if member is already banned (active ban exists with deleted_at: null)
  const existingBan = await MyGlobal.prisma.discussion_board_bans.findFirst({
    where: {
      member_id: props.body.member_id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (existingBan) {
    throw new HttpException("Member is already banned", 409);
  }
  // Create ban record using Collector for data transformation
  const ban = await MyGlobal.prisma.discussion_board_bans.create({
    data: await DiscussionBoardBanCollector.collect({
      body: props.body,
      discussionBoardAdmins: { id: props.admin.id },
      discussionBoardAdminSessions: { id: props.admin.session_id },
    }),
    ...DiscussionBoardBanTransformer.select(),
  });
  // Transform database result to API response DTO
  return await DiscussionBoardBanTransformer.transform(ban);
}
