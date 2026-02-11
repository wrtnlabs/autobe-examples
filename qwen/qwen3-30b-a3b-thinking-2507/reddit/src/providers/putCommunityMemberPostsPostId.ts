import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPostTransformer } from "../transformers/CommunityPostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPost.IUpdate;
}): Promise<ICommunityPost> {
  // Verify post exists and is authored by current member
  const post = await MyGlobal.prisma.community_posts.findUnique({
    where: { id: props.postId },
    select: {
      id: true,
      author_id: true,
      type: true,
      deleted_at: true,
    },
  });
  if (!post) throw new HttpException("Post not found", 404);
  if (post.deleted_at) throw new HttpException("Post is soft-deleted", 403);
  if (post.author_id !== props.member.id)
    throw new HttpException("Not authorized to update this post", 403);
  // Update post without relationships (Prisma update cannot handle include)
  await MyGlobal.prisma.community_posts.update({
    where: { id: props.postId },
    data: {
      title: props.body.title,
      content: props.body.content,
      url: props.body.url ?? "",
      image_url: props.body.image_url,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // Retrieve updated post with all relations for transformation
  const updated = await MyGlobal.prisma.community_posts.findUnique({
    where: { id: props.postId },
    ...CommunityPostTransformer.select(),
  });
  return await CommunityPostTransformer.transform(updated);
}
