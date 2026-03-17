import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserKarma";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityUserKarmaTransformer } from "../transformers/RedditCommunityUserKarmaTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunityMembersMemberIdKarma(props: {
  memberId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityUserKarma> {
  const karmaRecord =
    await MyGlobal.prisma.reddit_community_user_karmas.findFirst({
      where: {
        reddit_community_member_id: props.memberId,
      },
      include: {
        member: true,
      },
    });
  if (karmaRecord) {
    return await RedditCommunityUserKarmaTransformer.transform(karmaRecord);
  }
  const now = new Date();
  const defaultKarma: Prisma.reddit_community_user_karmasCreateInput = {
    id: v4(),
    member: { connect: { id: props.memberId } },
    current_score: 0,
    created_at: toISOStringSafe(now),
    updated_at: toISOStringSafe(now),
  };
  await MyGlobal.prisma.reddit_community_user_karmas.create({
    data: defaultKarma,
  });
  const createdRecord =
    await MyGlobal.prisma.reddit_community_user_karmas.findFirst({
      where: {
        reddit_community_member_id: props.memberId,
      },
      include: {
        member: true,
      },
    });
  if (!createdRecord) {
    throw new HttpException("Failed to create karma record", 500);
  }
  return await RedditCommunityUserKarmaTransformer.transform(createdRecord);
}
