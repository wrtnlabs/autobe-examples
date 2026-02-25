import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import { IRedditMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditMemberAtSummaryTransformer } from "../transformers/RedditMemberAtSummaryTransformer";
import { RedditMemberPasswordResetTransformer } from "../transformers/RedditMemberPasswordResetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditMemberPasswordResetsResetId(props: {
  member: MemberPayload;
  resetId: string & tags.Format<"uuid">;
}): Promise<IRedditMemberPasswordReset> {
  const token =
    await MyGlobal.prisma.reddit_member_password_resets.findUniqueOrThrow({
      where: { id: props.resetId },
      select: {
        id: true,
        token: true,
        expires_at: true,
        used_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: RedditMemberAtSummaryTransformer.select(),
      },
    });
  if (token.member.id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await RedditMemberPasswordResetTransformer.transform(token);
}
