import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformMemberTransformer } from "../transformers/RedditPlatformMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformMembersMemberId(props: {
  memberId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformMember> {
  const member =
    await MyGlobal.prisma.reddit_platform_members.findUniqueOrThrow({
      where: { id: props.memberId },
      ...RedditPlatformMemberTransformer.select(),
    });
  return await RedditPlatformMemberTransformer.transform(member);
}
