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
  let karma = await MyGlobal.prisma.reddit_community_user_karmas.findUnique({
    where: { reddit_community_member_id: props.memberId },
    ...RedditCommunityUserKarmaTransformer.select(),
  });
  if (!karma) {
    karma = await MyGlobal.prisma.reddit_community_user_karmas.create({
      data: {
        id: v4(),
        reddit_community_member_id: props.memberId,
        current_score: 0,
        created_at: new Date(),
        updated_at: new Date(),
      },
      ...RedditCommunityUserKarmaTransformer.select(),
    });
  }
  return await RedditCommunityUserKarmaTransformer.transform(karma);
}
