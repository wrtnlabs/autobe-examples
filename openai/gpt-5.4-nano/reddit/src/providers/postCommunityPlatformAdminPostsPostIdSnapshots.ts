import { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformPostSnapshotTransformer } from "../transformers/CommunityPlatformPostSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAdminPostsPostIdSnapshots(props: {
  admin: AdminPayload;
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
        edited_by_id: true,
        deleted_by_id: true,
      },
    },
  );
  const isLinkPost = post.post_type === "link";
  const nowIso = toISOStringSafe(new Date());
  const publishedAtIso = toISOStringSafe(new Date(props.body.publishedAt));
  const snapshot =
    await MyGlobal.prisma.community_platform_post_snapshots.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        post: { connect: { id: post.id } },
        community_id: post.community_id,
        author_user_id: post.author_id,
        post_type: post.post_type,
        title: props.body.title,
        body: props.body.body,
        link_url: isLinkPost ? props.body.linkUrl : null,
        edited_by_user_id: null,
        deleted_by_user_id: null,
        published_at: publishedAtIso as unknown as Date,
        created_at: nowIso as unknown as Date,
        updated_at: nowIso as unknown as Date,
        deleted_at: null,
      },
      ...CommunityPlatformPostSnapshotTransformer.select(),
    });
  return await CommunityPlatformPostSnapshotTransformer.transform(snapshot);
}
