import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityMemberAtProfileTransformer } from "../transformers/RedditCommunityMemberAtProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunityMembersMemberId(props: {
  memberId: string;
}): Promise<IRedditCommunityMember.IProfile> {
  const user = await MyGlobal.prisma.reddit_community_users.findFirst({
    where: {
      username: props.memberId,
      is_deleted: false,
    },
    ...RedditCommunityMemberAtProfileTransformer.select(),
  });
  if (!user) {
    throw new HttpException("Not Found", 404);
  }
  return await RedditCommunityMemberAtProfileTransformer.transform(user);
}
