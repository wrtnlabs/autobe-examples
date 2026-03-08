import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformMemberAtSummaryTransformer } from "../transformers/RedditPlatformMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformUsersUserId(props: {
  userId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformMember.ISummary> {
  const member =
    await MyGlobal.prisma.reddit_platform_members.findUniqueOrThrow({
      where: {
        id: props.userId,
        deleted_at: null,
      },
      ...RedditPlatformMemberAtSummaryTransformer.select(),
    });
  return await RedditPlatformMemberAtSummaryTransformer.transform(member);
}
