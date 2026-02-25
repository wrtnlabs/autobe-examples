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
  const updated = await MyGlobal.prisma.discussion_board_members.update({
    where: { id: props.member.id },
    data: {
      display_name: props.body.display_name,
      bio: props.body.bio ?? null,
      updated_at: new Date(),
    },
    select: {
      id: true,
      email: true,
      display_name: true,
      bio: true,
      is_active: true,
      is_admin: true,
      is_super_admin: true,
      created_at: true,
      updated_at: true,
    },
  });
  return DiscussionBoardMemberTransformer.transform({
    ...updated,
    password_hash: "",
    comments: [],
    passwordResets: [],
    emailVerification: null,
    sessions: [],
    articles: [],
  });
}
