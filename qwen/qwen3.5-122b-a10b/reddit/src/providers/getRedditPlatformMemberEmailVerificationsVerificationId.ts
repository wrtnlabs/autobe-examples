import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformMemberEmailVerificationTransformer } from "../transformers/RedditPlatformMemberEmailVerificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformMemberEmailVerificationsVerificationId(props: {
  member: MemberPayload;
  verificationId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformMemberEmailVerification> {
  const verification =
    await MyGlobal.prisma.reddit_platform_member_email_verifications.findUniqueOrThrow(
      {
        where: {
          id: props.verificationId,
          deleted_at: null,
        },
        ...RedditPlatformMemberEmailVerificationTransformer.select(),
      },
    );
  if (
    verification.member === null ||
    verification.member.id !== props.member.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  return await RedditPlatformMemberEmailVerificationTransformer.transform(
    verification,
  );
}
