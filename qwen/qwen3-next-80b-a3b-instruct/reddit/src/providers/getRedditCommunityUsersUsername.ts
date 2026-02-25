import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityMemberAtSummaryTransformer } from "../transformers/RedditCommunityMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunityUsersUsername(props: {
  username: string;
}): Promise<IRedditCommunityMember.ISummary> {
  const user = await MyGlobal.prisma.reddit_community_members.findUniqueOrThrow(
    {
      where: { username: props.username, is_deleted: false },
      ...RedditCommunityMemberAtSummaryTransformer.select(),
    },
  );
  return await RedditCommunityMemberAtSummaryTransformer.transform(user);
}
