import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommentCollector } from "../collectors/CommunityPlatformCommentCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformCommentTransformer } from "../transformers/CommunityPlatformCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformMemberPostsPostIdComments(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformComment.ICreate;
}): Promise<ICommunityPlatformComment> {
  // Validate post exists and is not deleted
  await MyGlobal.prisma.community_platform_posts.findFirstOrThrow({
    where: {
      id: props.postId,
      deleted_at: null,
    },
  });
  // Validate parent comment belongs to same post if provided
  if (
    props.body.parent_comment_id !== undefined &&
    props.body.parent_comment_id !== null
  ) {
    const parentComment =
      await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
        where: { id: props.body.parent_comment_id },
      });
    if (parentComment.community_platform_post_id !== props.postId) {
      throw new HttpException(
        "Parent comment does not belong to this post",
        400,
      );
    }
  }
  // Create comment using Collector and Transformer
  const created = await MyGlobal.prisma.community_platform_comments.create({
    data: await CommunityPlatformCommentCollector.collect({
      body: props.body,
      communityPlatformPosts: { id: props.postId },
      communityPlatformMembers: { id: props.member.id },
      communityPlatformMemberSessions: { id: props.member.session_id },
    }),
    ...CommunityPlatformCommentTransformer.select(),
  });
  return await CommunityPlatformCommentTransformer.transform(created);
}
