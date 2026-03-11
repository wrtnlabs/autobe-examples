import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardMemberTransformer } from "../transformers/DiscussionBoardMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardMembersMemberId(props: {
  memberId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardMember> {
  const member =
    await MyGlobal.prisma.discussion_board_members.findUniqueOrThrow({
      where: {
        id: props.memberId,
        deleted_at: null,
      },
      ...DiscussionBoardMemberTransformer.select(),
    });
  return await DiscussionBoardMemberTransformer.transform(member);
}
