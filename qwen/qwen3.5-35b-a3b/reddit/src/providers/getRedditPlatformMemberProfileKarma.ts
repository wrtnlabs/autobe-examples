import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformMemberProfileKarma(props: {
  member: MemberPayload;
}): Promise<IRedditPlatformMember.IKarma> {
  const account = await MyGlobal.prisma.reddit_platform_members.findFirst({
    where: {
      id: props.member.id,
      is_active: true,
      deleted_at: null,
    },
    select: {
      karma_score: true,
    },
  });
  if (account === null) {
    throw new HttpException("Account not found", 404);
  }
  return {
    karma_score: account.karma_score,
  } satisfies IRedditPlatformMember.IKarma;
}
