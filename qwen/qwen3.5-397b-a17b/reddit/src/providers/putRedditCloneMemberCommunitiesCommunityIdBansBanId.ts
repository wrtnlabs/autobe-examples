import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBan";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneBanTransformer } from "../transformers/RedditCloneBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCloneMemberCommunitiesCommunityIdBansBanId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  banId: string & tags.Format<"uuid">;
  body: IRedditCloneBan.IUpdate;
}): Promise<IRedditCloneBan> {
  // Verify moderator authorization
  const moderator = await MyGlobal.prisma.reddit_clone_moderators.findFirst({
    where: {
      member_id: props.member.id,
      community_id: props.communityId,
    },
  });
  if (!moderator) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify ban exists and belongs to the community
  await MyGlobal.prisma.reddit_clone_bans.findUniqueOrThrow({
    where: {
      id: props.banId,
      community_id: props.communityId,
    },
  });
  // Build update data with proper Date conversion for Prisma
  const updateData = {
    ...(props.body.reason !== undefined && { reason: props.body.reason }),
    ...(props.body.deleted_at !== undefined && {
      deleted_at:
        props.body.deleted_at === null ? null : new Date(props.body.deleted_at),
    }),
    updated_at: new Date(),
  } satisfies Prisma.reddit_clone_bansUpdateInput;
  // Execute update
  await MyGlobal.prisma.reddit_clone_bans.update({
    where: {
      id: props.banId,
    },
    data: updateData,
  });
  // Fetch updated record with all relations using transformer select
  const updated = await MyGlobal.prisma.reddit_clone_bans.findUniqueOrThrow({
    where: {
      id: props.banId,
    },
    ...RedditCloneBanTransformer.select(),
  });
  // Transform and return using transformer
  return await RedditCloneBanTransformer.transform(updated);
}
