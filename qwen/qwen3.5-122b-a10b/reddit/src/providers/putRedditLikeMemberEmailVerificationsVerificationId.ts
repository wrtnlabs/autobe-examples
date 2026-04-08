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

export async function putRedditLikeMemberEmailVerificationsVerificationId(props: {
  member: MemberPayload;
  verificationId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeMember> {
  const verification =
    await MyGlobal.prisma.reddit_like_member_email_verifications.findUnique({
      where: { id: props.verificationId },
    });
  if (verification === null) {
    throw new HttpException("Verification token not found", 404);
  }
  if (verification.deleted_at !== null) {
    throw new HttpException("Token already verified", 400);
  }
  const now = new Date();
  if (now > verification.expires_at) {
    throw new HttpException("Token expired", 400);
  }
  await MyGlobal.prisma.reddit_like_member_email_verifications.update({
    where: { id: props.verificationId },
    data: { deleted_at: now },
  });
  const updated = await MyGlobal.prisma.reddit_like_members.findUniqueOrThrow({
    where: { id: verification.reddit_like_member_id },
    ...RedditLikeMemberTransformer.select(),
  });
  return await RedditLikeMemberTransformer.transform(updated);
}
