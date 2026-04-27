import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
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
  // 1. Validate the post exists and is not soft-deleted
  const post = await MyGlobal.prisma.community_platform_posts.findFirst({
    where: {
      id: props.postId,
      deleted_at: null,
    },
    select: {
      id: true,
      community_id: true,
    },
  });
  if (post === null) {
    throw new HttpException(
      "The post is no longer available for commenting.",
      404,
    );
  }
  // 2. Check if the member is banned from this community
  // Check both ban tables for community-scoped bans
  const [ban, communityBan] = await Promise.all([
    MyGlobal.prisma.community_platform_bans.findFirst({
      where: {
        community_platform_community_id: post.community_id,
        community_platform_member_id: props.member.id,
      },
      select: { id: true },
    }),
    MyGlobal.prisma.community_platform_community_bans.findFirst({
      where: {
        community_platform_community_id: post.community_id,
        community_platform_member_id: props.member.id,
      },
      select: { id: true },
    }),
  ]);
  if (ban !== null || communityBan !== null) {
    throw new HttpException(
      "You are banned from commenting in this community.",
      403,
    );
  }
  // 3. Validate parent comment if commentId is provided
  let resolvedCommentId: string | null | undefined = props.body.commentId;
  if (props.body.commentId !== undefined && props.body.commentId !== null) {
    const parentComment =
      await MyGlobal.prisma.community_platform_comments.findFirst({
        where: {
          id: props.body.commentId,
          community_platform_post_id: props.postId,
        },
        select: {
          id: true,
          deleted_at: true,
        },
      });
    if (parentComment === null) {
      throw new HttpException(
        "The parent comment does not exist on this post.",
        404,
      );
    }
    // Per spec 178: If parent comment is deleted, post as top-level comment
    // The collector handles null commentId by skipping the parentComment connect
    if (parentComment.deleted_at !== null) {
      resolvedCommentId = null;
    }
  }
  // 4. Create the comment using the Collector
  const created = await MyGlobal.prisma.community_platform_comments.create({
    data: await CommunityPlatformCommentCollector.collect({
      body: {
        content: props.body.content,
        commentId: resolvedCommentId,
      },
      communityPlatformMembers: { id: props.member.id } satisfies IEntity,
      communityPlatformMemberSessions: {
        id: props.member.session_id,
      } satisfies IEntity,
      communityPlatformPosts: { id: props.postId } satisfies IEntity,
    }),
    ...CommunityPlatformCommentTransformer.select(),
  });
  // 5. Increment the post's denormalized comment_count
  await MyGlobal.prisma.community_platform_posts.update({
    where: { id: props.postId },
    data: {
      comment_count: { increment: 1 },
    },
  });
  // 6. Return the created comment via Transformer
  return await CommunityPlatformCommentTransformer.transform(created);
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
// import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postCommunityPlatformMemberPostsPostIdComments(props: {
//   member: MemberPayload;
//   postId: string & tags.Format<"uuid">;
//   body: ICommunityPlatformComment.ICreate;
// }): Promise<ICommunityPlatformComment> {
//   const record = await MyGlobal.prisma.community_platform_comments.create({
//     data: await CommunityPlatformCommentCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...CommunityPlatformCommentTransformer.select(),
//   });
//   return await CommunityPlatformCommentTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------