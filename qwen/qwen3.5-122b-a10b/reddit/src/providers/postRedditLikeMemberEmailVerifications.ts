import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikeMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMemberEmailVerification";
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

export async function postRedditLikeMemberEmailVerifications(props: {
  member: MemberPayload;
  body: IRedditLikeMemberEmailVerification.IVerify;
}): Promise<IRedditLikeMember> {
  const verification =
    await MyGlobal.prisma.reddit_like_member_email_verifications.findFirst({
      where: {
        token: props.body.token,
        deleted_at: null,
      },
    });
  if (!verification) {
    throw new HttpException("Invalid verification token", 400);
  }
  const now = new Date();
  const expiresAt = new Date(verification.expires_at);
  if (expiresAt <= now) {
    throw new HttpException("Verification token has expired", 400);
  }
  await MyGlobal.prisma.reddit_like_member_email_verifications.update({
    where: { id: verification.id },
    data: { deleted_at: new Date() },
  });
  const member = await MyGlobal.prisma.reddit_like_members.findUnique({
    where: { id: verification.reddit_like_member_id },
    ...RedditLikeMemberTransformer.select(),
  });
  if (!member) {
    throw new HttpException("Member not found", 404);
  }
  return await RedditLikeMemberTransformer.transform(member);
}
