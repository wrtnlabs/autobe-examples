import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformMemberPasswordResetAtVerifyTransformer } from "../transformers/RedditPlatformMemberPasswordResetAtVerifyTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformMemberPasswordResetsResetId(props: {
  member: MemberPayload;
  resetId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformMemberPasswordReset.IVerify> {
  const record =
    await MyGlobal.prisma.reddit_platform_member_password_resets.findUniqueOrThrow(
      {
        where: { id: props.resetId },
        ...RedditPlatformMemberPasswordResetAtVerifyTransformer.select(),
      },
    );
  return await RedditPlatformMemberPasswordResetAtVerifyTransformer.transform(
    record,
  );
}
