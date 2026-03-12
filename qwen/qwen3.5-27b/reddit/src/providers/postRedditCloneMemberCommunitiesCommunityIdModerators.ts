import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneCommunityModeratorCollector } from "../collectors/RedditCloneCommunityModeratorCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneCommunityModeratorTransformer } from "../transformers/RedditCloneCommunityModeratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneMemberCommunitiesCommunityIdModerators(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditCloneCommunityModerator.ICreate;
}): Promise<IRedditCloneCommunityModerator> {
  // 1. Verify the community exists and is not soft-deleted
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
  // 2. Verify the caller is the owner of the community
  if (community.owner_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Validate the member exists and is not soft-deleted
  await MyGlobal.prisma.reddit_clone_members.findUniqueOrThrow({
    where: {
      id: props.body.memberId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  // 4. Check that the member is not already a moderator in this community
  const existingModerator =
    await MyGlobal.prisma.reddit_clone_community_moderators.findFirst({
      where: {
        reddit_clone_communities_id: props.communityId,
        reddit_clone_members_id: props.body.memberId,
        deleted_at: null,
      },
    });
  if (existingModerator !== null) {
    throw new HttpException(
      "Member is already a moderator in this community",
      409,
    );
  }
  // 5. Validate the role (reject 'owner', default to 'mod')
  const role = props.body.role ?? "mod";
  if (role === "owner") {
    throw new HttpException("Only the community creator can be the owner", 400);
  }
  // 6. Create the moderator record using the Collector
  const created =
    await MyGlobal.prisma.reddit_clone_community_moderators.create({
      data: await RedditCloneCommunityModeratorCollector.collect({
        body: props.body,
        redditCloneCommunities: community,
      }),
      ...RedditCloneCommunityModeratorTransformer.select(),
    });
  // 7. Return the created record using the Transformer
  return await RedditCloneCommunityModeratorTransformer.transform(created);
}
