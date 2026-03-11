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
  // Validate display name length (1-50 characters)
  if (props.body.displayName.length < 1 || props.body.displayName.length > 50) {
    throw new HttpException(
      "Display name must be between 1 and 50 characters",
      400,
    );
  }
  // Validate bio length if provided (max 500 characters)
  if (props.body.bio && props.body.bio.length > 500) {
    throw new HttpException("Bio must not exceed 500 characters", 400);
  }
  // Update the member's profile information
  const updatedMember = await MyGlobal.prisma.discussion_board_members.update({
    where: {
      id: props.member.id,
      is_banned: false,
      deleted_at: null,
    },
    data: {
      display_name: props.body.displayName,
      bio: props.body.bio ?? null,
      updated_at: new Date(),
    },
    ...DiscussionBoardMemberTransformer.select(),
  });
  // Transform and return the updated member
  return await DiscussionBoardMemberTransformer.transform(updatedMember);
}
