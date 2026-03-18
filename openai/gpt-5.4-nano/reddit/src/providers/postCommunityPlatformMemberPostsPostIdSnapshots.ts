import { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformPostSnapshotTransformer } from "../transformers/CommunityPlatformPostSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformMemberPostsPostIdSnapshots(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostSnapshot.ICreate;
}): Promise<ICommunityPlatformPostSnapshot> {
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      select: {
        id: true,
        community_id: true,
        author_id: true,
        post_type: true,
        deleted_at: true,
      },
    },
  );
  if (post.deleted_at !== null) {
    throw new HttpException("Post is deleted", 400);
  }
  const linkUrl = post.post_type === "link" ? props.body.linkUrl : null;
  const nowIso = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.community_platform_post_snapshots.create({
      data: {
        id: v4(),
        post: { connect: { id: post.id } },
        community_id: post.community_id,
        author_user_id: post.author_id,
        post_type: post.post_type,
        title: props.body.title,
        body: props.body.body,
        link_url: linkUrl,
        edited_by_user_id: null,
        deleted_by_user_id: null,
        published_at: props.body.publishedAt,
        created_at: nowIso,
        updated_at: nowIso,
        deleted_at: null,
      },
      ...CommunityPlatformPostSnapshotTransformer.select(),
    });
  return await CommunityPlatformPostSnapshotTransformer.transform(created);
}
