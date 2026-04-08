import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikeMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeMemberTransformer } from "../transformers/RedditLikeMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditLikeMemberPasswordResetsResetId(props: {
  member: MemberPayload;
  resetId: string & tags.Format<"uuid">;
  body: IRedditLikeMemberPasswordReset.IUpdate;
}): Promise<IRedditLikeMember> {
  const passwordReset =
    await MyGlobal.prisma.reddit_like_member_password_resets.findUniqueOrThrow({
      where: {
        id: props.resetId,
        deleted_at: null,
      },
    });
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  if (now > toISOStringSafe(passwordReset.expires_at)) {
    throw new HttpException("Password reset token has expired", 410);
  }
  if (!props.body.password || props.body.password.length < 8) {
    throw new HttpException(
      "Password does not meet security requirements",
      400,
    );
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.reddit_like_members.update({
      where: { id: props.member.id },
      data: {
        password_hash: await PasswordUtil.hash(props.body.password),
        updated_at: now,
      },
    });
    await tx.reddit_like_member_password_resets.update({
      where: { id: props.resetId },
      data: { deleted_at: now },
    });
    await tx.reddit_like_member_sessions.updateMany({
      where: { reddit_like_member_id: props.member.id },
      data: { expired_at: now },
    });
  });
  const updated = await MyGlobal.prisma.reddit_like_members.findUniqueOrThrow({
    where: { id: props.member.id },
    ...RedditLikeMemberTransformer.select(),
  });
  return await RedditLikeMemberTransformer.transform(updated);
}
