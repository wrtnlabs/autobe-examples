import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberPasswordReset";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneMemberPasswordResetTransformer } from "../transformers/RedditCloneMemberPasswordResetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneMemberMemberPasswordResetsResetId(props: {
  member: MemberPayload;
  resetId: string & tags.Format<"uuid">;
}): Promise<IRedditCloneMemberPasswordReset> {
  const record =
    await MyGlobal.prisma.reddit_clone_member_password_resets.findFirstOrThrow({
      ...RedditCloneMemberPasswordResetTransformer.select(),
      where: {
        id: props.resetId,
        reddit_clone_member_id: props.member.id,
      },
    });
  return await RedditCloneMemberPasswordResetTransformer.transform(record);
}
