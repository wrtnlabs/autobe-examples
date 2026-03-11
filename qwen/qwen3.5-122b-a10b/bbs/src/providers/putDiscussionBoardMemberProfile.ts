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
  // Validate member exists and is not soft-deleted
  await MyGlobal.prisma.discussion_board_members.findUniqueOrThrow({
    where: {
      id: props.member.id,
      deleted_at: null,
    },
  });
  // Validate display_name if provided
  if (props.body.displayName !== undefined) {
    const trimmedDisplayName = props.body.displayName.trim();
    if (trimmedDisplayName.length === 0) {
      throw new HttpException("Display name cannot be empty", 400);
    }
    if (trimmedDisplayName.length > 100) {
      throw new HttpException(
        "Display name exceeds maximum length of 100 characters",
        400,
      );
    }
  }
  // Validate bio if provided
  if (props.body.bio !== undefined && props.body.bio !== null) {
    if (props.body.bio.length > 500) {
      throw new HttpException(
        "Bio exceeds maximum length of 500 characters",
        400,
      );
    }
  }
  // Update member profile
  const now = new Date();
  await MyGlobal.prisma.discussion_board_members.update({
    where: { id: props.member.id },
    data: {
      ...(props.body.displayName !== undefined && {
        display_name: props.body.displayName.trim(),
      }),
      ...(props.body.bio !== undefined && {
        bio: props.body.bio,
      }),
      updated_at: now,
    },
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
