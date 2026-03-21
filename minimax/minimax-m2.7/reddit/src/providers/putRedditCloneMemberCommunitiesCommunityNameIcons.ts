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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneCommunityIconTransformer } from "../transformers/RedditCloneCommunityIconTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCloneMemberCommunitiesCommunityNameIcons(props: {
  member: MemberPayload;
  communityName: string;
  body: IRedditCloneCommunityIcon.IUpdate;
}): Promise<IRedditCloneCommunityIcon> {
  // 1. Look up community by name (case-insensitive)
  const community = await MyGlobal.prisma.reddit_clone_communities.findFirst({
    where: { name: props.communityName },
    select: {
      id: true,
      name: true,
      reddit_clone_member_id: true,
    },
  });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  // 2. Verify the authenticated user is the owner
  if (community.reddit_clone_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Look up the file by URI
  const file = await MyGlobal.prisma.reddit_clone_files.findFirst({
    where: { id: props.body.fileUri },
    select: {
      id: true,
      status: true,
    },
  });
  if (!file) {
    throw new HttpException("File not found", 404);
  }
  // 4. Verify the file has status='processed' (virus scan completed)
  if (file.status !== "processed") {
    throw new HttpException(
      "File is not yet processed. Please wait for virus scan to complete.",
      400,
    );
  }
  // 5. Use transaction to upsert community icon and file association
  const updatedIcon = await MyGlobal.prisma.$transaction(async (tx) => {
    // Check if community already has an icon
    const existingIcon = await tx.reddit_clone_community_icons.findFirst({
      where: { reddit_clone_community_id: community.id },
      select: { id: true },
    });
    if (existingIcon) {
      // Update existing icon record
      await tx.reddit_clone_community_icons.update({
        where: { id: existingIcon.id },
        data: {
          reddit_clone_file_id: file.id,
        },
      });
    } else {
      // Create new icon record
      await tx.reddit_clone_community_icons.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          reddit_clone_community_id: community.id,
          reddit_clone_file_id: file.id,
          created_at: new Date(),
        },
      });
    }
    // Update file association for target_type='community'
    await tx.reddit_clone_file_associations.upsert({
      where: {
        id: file.id,
      },
      create: {
        id: v4() as string & tags.Format<"uuid">,
        target_id: community.id,
        target_type: "community",
        reddit_clone_file_id: file.id,
        created_at: new Date(),
        updated_at: new Date(),
      },
      update: {
        target_id: community.id,
        target_type: "community",
        updated_at: new Date(),
      },
    });
    // Fetch and return the updated icon with relations
    return tx.reddit_clone_community_icons.findFirst({
      where: { reddit_clone_community_id: community.id },
      ...RedditCloneCommunityIconTransformer.select(),
    });
  });
  if (!updatedIcon) {
    throw new HttpException("Failed to update community icon", 500);
  }
  return RedditCloneCommunityIconTransformer.transform(updatedIcon);
}
