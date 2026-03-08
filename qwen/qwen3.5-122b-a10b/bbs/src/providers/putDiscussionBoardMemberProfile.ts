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
import { DiscussionBoardMemberTransformer } from "../transformers/DiscussionBoardMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardMemberProfile(props: {
  member: MemberPayload;
  body: IDiscussionBoardMember.IUpdate;
}): Promise<IDiscussionBoardMember> {
  // Build update data
  const updateData: Prisma.discussion_board_membersUpdateInput = {
    ...(props.body.displayName !== undefined && {
      display_name: props.body.displayName,
    }),
    ...(props.body.bio !== undefined && {
      bio: props.body.bio,
    }),
    updated_at: new Date(),
  };
  // Update member profile
  await MyGlobal.prisma.discussion_board_members.update({
    where: { id: props.member.id },
    data: updateData,
  });
  // Fetch updated member with transformer select
  const updated =
    await MyGlobal.prisma.discussion_board_members.findUniqueOrThrow({
      where: { id: props.member.id },
      ...DiscussionBoardMemberTransformer.select(),
    });
  // Transform and return
  return await DiscussionBoardMemberTransformer.transform(updated);
}
