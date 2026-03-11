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

export async function getDiscussionBoardMemberProfile(props: {
  member: MemberPayload;
}): Promise<IDiscussionBoardMember> {
  const member =
    await MyGlobal.prisma.discussion_board_members.findUniqueOrThrow({
      where: {
        id: props.member.id,
        deleted_at: null,
      },
      ...DiscussionBoardMemberTransformer.select(),
    });
  return await DiscussionBoardMemberTransformer.transform(member);
}
