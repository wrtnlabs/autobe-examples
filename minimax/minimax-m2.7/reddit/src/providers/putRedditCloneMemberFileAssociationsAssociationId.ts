import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
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
import { RedditCloneFileAssociationTransformer } from "../transformers/RedditCloneFileAssociationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCloneMemberFileAssociationsAssociationId(props: {
  member: MemberPayload;
  associationId: string & tags.Format<"uuid">;
  body: IRedditCloneFileAssociation.IUpdate;
}): Promise<IRedditCloneFileAssociation> {
  // 1. Find the existing file association
  const association =
    await MyGlobal.prisma.reddit_clone_file_associations.findUniqueOrThrow({
      where: { id: props.associationId },
      select: {
        id: true,
        target_type: true,
        target_id: true,
      },
    });
  // 2. Authorization check based on target_type
  if (association.target_type === "user") {
    // For user avatars: only the user who owns the avatar can update
    if (association.target_id !== props.member.id) {
      throw new HttpException("Forbidden", 403);
    }
  } else if (association.target_type === "community") {
    // For community icons: user must be owner or moderator
    const community =
      await MyGlobal.prisma.reddit_clone_communities.findUniqueOrThrow({
        where: { id: association.target_id },
        select: { reddit_clone_member_id: true },
      });
    // Check if user is owner
    const isOwner = community.reddit_clone_member_id === props.member.id;
    if (!isOwner) {
      // Check if user is moderator
      const moderator =
        await MyGlobal.prisma.reddit_clone_community_moderators.findFirst({
          where: {
            reddit_clone_community_id: association.target_id,
            reddit_clone_member_id: props.member.id,
          },
          select: { id: true },
        });
      if (!moderator) {
        throw new HttpException("Forbidden", 403);
      }
    }
  } else if (association.target_type === "post") {
    // For post images: user must be the author of the post
    const post = await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
      where: { id: association.target_id },
      select: { reddit_clone_member_id: true },
    });
    if (post.reddit_clone_member_id !== props.member.id) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // 3. Validate the new file exists and has clean virus scan
  const file = await MyGlobal.prisma.reddit_clone_files.findUniqueOrThrow({
    where: { id: props.body.reddit_clone_file_id },
    select: { id: true, deleted_at: true },
  });
  if (file.deleted_at !== null) {
    throw new HttpException("File has been deleted", 400);
  }
  // Check virus scan status - must have at least one clean scan
  const cleanScan = await MyGlobal.prisma.reddit_clone_file_scans.findFirst({
    where: {
      reddit_clone_file_id: props.body.reddit_clone_file_id,
      status: "clean",
    },
    select: { id: true },
  });
  if (!cleanScan) {
    throw new HttpException("File has not passed virus scanning", 400);
  }
  // 4. Update the file association with new file_id and updated_at
  await MyGlobal.prisma.reddit_clone_file_associations.update({
    where: { id: props.associationId },
    data: {
      reddit_clone_file_id: props.body.reddit_clone_file_id,
      updated_at: new Date(),
    },
  });
  // 5. Fetch the updated record with transformer select
  const updated =
    await MyGlobal.prisma.reddit_clone_file_associations.findUniqueOrThrow({
      where: { id: props.associationId },
      ...RedditCloneFileAssociationTransformer.select(),
    });
  // 6. Return transformed response
  return await RedditCloneFileAssociationTransformer.transform(updated);
}
