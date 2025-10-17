import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeAuthMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAuthMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postRedditLikeMemberAuthMemberLogout(props: {
  member: MemberPayload;
  body: IRedditLikeAuthMember.ILogout;
}): Promise<void> {
  const { member } = props;

  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.reddit_like_sessions.updateMany({
    where: {
      reddit_like_user_id: member.id,
      deleted_at: null,
    },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}
