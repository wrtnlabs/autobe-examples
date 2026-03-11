import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformPostEngagementStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostEngagementStat";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformPostEngagementStatTransformer } from "../transformers/RedditPlatformPostEngagementStatTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformMemberProfileStats(props: {
  member: MemberPayload;
}): Promise<IRedditPlatformPostEngagementStat> {
  const member =
    await MyGlobal.prisma.reddit_platform_members.findUniqueOrThrow({
      where: {
        id: props.member.id,
        deleted_at: null,
      },
      ...RedditPlatformPostEngagementStatTransformer.select(),
    });
  return await RedditPlatformPostEngagementStatTransformer.transform(member);
}
