import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import { IRedditMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMemberEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditMemberEmailVerificationTransformer } from "../transformers/RedditMemberEmailVerificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditMemberEmailVerificationsVerificationId(props: {
  member: MemberPayload;
  verificationId: string & tags.Format<"uuid">;
}): Promise<IRedditMemberEmailVerification> {
  const verification =
    await MyGlobal.prisma.reddit_member_email_verifications.findUniqueOrThrow({
      where: {
        id: props.verificationId,
        deleted_at: null,
      },
      ...RedditMemberEmailVerificationTransformer.select(),
    });
  return await RedditMemberEmailVerificationTransformer.transform(verification);
}
