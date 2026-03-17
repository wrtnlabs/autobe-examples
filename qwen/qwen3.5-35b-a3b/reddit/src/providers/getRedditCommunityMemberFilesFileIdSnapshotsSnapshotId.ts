import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityFileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityFileSnapshotTransformer } from "../transformers/RedditCommunityFileSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunityMemberFilesFileIdSnapshotsSnapshotId(props: {
  member: MemberPayload;
  fileId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityFileSnapshot> {
  const snapshot =
    await MyGlobal.prisma.reddit_community_file_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      select: {
        id: true,
        snapshot_created_at: true,
        created_at: true,
        updated_at: true,
        file: RedditCommunityFileSnapshotTransformer.select().select.file,
      },
    });
  const file = snapshot.file;
  const ownerId = await getOwnerId(file, props.member.id);
  if (ownerId === null || ownerId !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await RedditCommunityFileSnapshotTransformer.transform(snapshot);
}
async function getOwnerId(
  file: {
    id: string;
    file_type: string;
  },
  memberId: string,
): Promise<string | null> {
  if (file.file_type === "user_avatar") {
    const ofUser =
      await MyGlobal.prisma.reddit_community_file_of_users.findUnique({
        where: { id: file.id },
        select: { reddit_community_member_id: true },
      });
    return ofUser?.reddit_community_member_id ?? null;
  } else if (file.file_type === "community_icon") {
    const ofCommunity =
      await MyGlobal.prisma.reddit_community_file_of_communities.findUnique({
        where: { id: file.id },
        select: { reddit_community_community_id: true },
      });
    const communityId = ofCommunity?.reddit_community_community_id;
    if (!communityId) return null;
    const moderator =
      await MyGlobal.prisma.reddit_community_moderators.findFirst({
        where: {
          reddit_community_community_id: communityId,
          reddit_community_moderator_id: memberId,
          deleted_at: null,
        },
        select: { id: true },
      });
    return moderator ? communityId : null;
  } else if (file.file_type === "post_image") {
    const ofPost =
      await MyGlobal.prisma.reddit_community_file_of_posts.findUnique({
        where: { id: file.id },
        select: { reddit_community_post_id: true },
      });
    const postId = ofPost?.reddit_community_post_id;
    if (!postId) return null;
    const post = await MyGlobal.prisma.reddit_community_posts.findUnique({
      where: { id: postId },
      select: { community_id: true, author_id: true },
    });
    if (!post) return null;
    const moderator =
      await MyGlobal.prisma.reddit_community_moderators.findFirst({
        where: {
          reddit_community_community_id: post.community_id,
          reddit_community_moderator_id: memberId,
          deleted_at: null,
        },
        select: { id: true },
      });
    return moderator || post.author_id === memberId ? post.community_id : null;
  }
  return null;
}
