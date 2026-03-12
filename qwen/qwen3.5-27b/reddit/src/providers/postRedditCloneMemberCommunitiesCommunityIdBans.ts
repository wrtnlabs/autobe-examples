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
import { RedditCloneBanCollector } from "../collectors/RedditCloneBanCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneBanTransformer } from "../transformers/RedditCloneBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneMemberCommunitiesCommunityIdBans(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditCloneBan.ICreate;
}): Promise<IRedditCloneBan> {
  // 1. Validate community exists and is not deleted
  const community =
    await MyGlobal.prisma.reddit_clone_communities.findUniqueOrThrow({
      where: {
        id: props.communityId,
        deleted_at: null,
      },
      select: {
        id: true,
        owner_id: true,
      },
    });
  // 2. Verify requesting member has moderator role (owner or mod)
  const moderatorRecord =
    await MyGlobal.prisma.reddit_clone_community_moderators.findFirst({
      where: {
        community: { id: props.communityId },
        member: { id: props.member.id },
        deleted_at: null,
      },
      select: {
        role: true,
      },
    });
  if (moderatorRecord === null) {
    throw new HttpException("Forbidden", 403);
  }
  const isOwner = moderatorRecord.role === "owner";
  // 3. Validate target member exists and is not deleted
  const targetMember =
    await MyGlobal.prisma.reddit_clone_members.findUniqueOrThrow({
      where: {
        id: props.body.member_id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  // 4. Prevent moderators from banning community owner
  if (targetMember.id === community.owner_id) {
    throw new HttpException("Cannot ban community owner", 403);
  }
  // 5. Prevent regular moderators from banning other moderators
  if (!isOwner) {
    const targetModeratorRecord =
      await MyGlobal.prisma.reddit_clone_community_moderators.findFirst({
        where: {
          community: { id: props.communityId },
          member: { id: props.body.member_id },
          deleted_at: null,
        },
        select: {
          id: true,
        },
      });
    if (targetModeratorRecord !== null) {
      throw new HttpException("Cannot ban another moderator", 403);
    }
  }
  // 6. Check for existing ban (unique constraint)
  const existingBan = await MyGlobal.prisma.reddit_clone_bans.findFirst({
    where: {
      community_id: props.communityId,
      member_id: props.body.member_id,
      deleted_at: null,
      lifted_at: null, // Only check for active bans
    },
    select: {
      id: true,
    },
  });
  if (existingBan !== null) {
    throw new HttpException(
      "Member is already banned from this community",
      409,
    );
  }
  // 7. Create ban using Collector
  const created = await MyGlobal.prisma.reddit_clone_bans.create({
    data: await RedditCloneBanCollector.collect({
      body: props.body,
      redditCloneCommunities: { id: community.id } as IEntity,
    }),
    ...RedditCloneBanTransformer.select(),
  });
  // 8. Return created ban using Transformer
  return await RedditCloneBanTransformer.transform(created);
}
