import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
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

export async function putRedditLikeMemberPassword(props: {
  member: MemberPayload;
  body: IRedditLikeMember.IPasswordChange;
}): Promise<IRedditLikeMember> {
  const member = await MyGlobal.prisma.reddit_like_members.findUniqueOrThrow({
    where: { id: props.member.id },
    select: { password_hash: true },
  });
  const passwordMatch = await PasswordUtil.verify(
    props.body.currentPassword,
    member.password_hash,
  );
  if (passwordMatch === false) {
    throw new HttpException("Current password is incorrect", 401);
  }
  if (props.body.newPassword.length < 8) {
    throw new HttpException("New password must be at least 8 characters", 400);
  }
  if (props.body.newPassword === props.body.currentPassword) {
    throw new HttpException(
      "New password must be different from current password",
      400,
    );
  }
  const newPasswordHash = await PasswordUtil.hash(props.body.newPassword);
  await MyGlobal.prisma.reddit_like_members.update({
    where: { id: props.member.id },
    data: {
      password_hash: newPasswordHash,
      updated_at: new Date(),
    },
  });
  const updated = await MyGlobal.prisma.reddit_like_members.findUniqueOrThrow({
    where: { id: props.member.id },
    ...RedditLikeMemberTransformer.select(),
  });
  return await RedditLikeMemberTransformer.transform(updated);
}
