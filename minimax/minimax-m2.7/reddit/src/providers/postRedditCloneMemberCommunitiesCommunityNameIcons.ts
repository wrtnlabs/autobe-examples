import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneCommunityIconCollector } from "../collectors/RedditCloneCommunityIconCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneCommunityIconTransformer } from "../transformers/RedditCloneCommunityIconTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneMemberCommunitiesCommunityNameIcons(props: {
  member: MemberPayload;
  communityName: string;
  body: IRedditCloneCommunityIcon.ICreate;
}): Promise<IRedditCloneCommunityIcon> {
  // 1. Find the community by name
  const community = await MyGlobal.prisma.reddit_clone_communities.findUnique({
    where: { name: props.communityName },
    select: {
      id: true,
      name: true,
      reddit_clone_member_id: true,
    },
  });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  // 2. Validate the authenticated user is the owner of the community
  if (community.reddit_clone_member_id !== props.member.id) {
    throw new HttpException(
      "Forbidden: you are not the owner of this community",
      403,
    );
  }
  // 3. Validate the file exists and has status 'processed' (passed virus scan)
  const file = await MyGlobal.prisma.reddit_clone_files.findUnique({
    where: { id: props.body.iconFileId },
    select: {
      id: true,
      status: true,
    },
  });
  if (file === null) {
    throw new HttpException("File not found", 400);
  }
  if (file.status !== "processed") {
    throw new HttpException(
      "File is not processed yet. Virus scanning must be completed before associating the file.",
      400,
    );
  }
  // 4. Begin transaction: delete existing icon and create new one
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    // Delete existing icon association if present
    await tx.reddit_clone_community_icons.deleteMany({
      where: { reddit_clone_community_id: community.id },
    });
    // Create new icon association using collector
    const iconData = await RedditCloneCommunityIconCollector.collect({
      body: props.body,
      redditCloneCommunities: { id: community.id },
      redditCloneMembers: { id: props.member.id },
      redditCloneMemberSessions: { id: props.member.session_id },
    });
    const icon = await tx.reddit_clone_community_icons.create({
      data: iconData,
      ...RedditCloneCommunityIconTransformer.select(),
    });
    // Create file association record with target_type='community'
    await tx.reddit_clone_file_associations.create({
      data: {
        id: v4(),
        target_id: community.id,
        target_type: "community",
        reddit_clone_file_id: props.body.iconFileId,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    return icon;
  });
  // 5. Transform and return the result
  return await RedditCloneCommunityIconTransformer.transform(result);
}
