import { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
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
import { CommunityCommentCollector } from "../collectors/CommunityCommentCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityCommentTransformer } from "../transformers/CommunityCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityMemberPostsPostIdComments(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityComment.ICreate;
}): Promise<ICommunityComment> {
  const post = await MyGlobal.prisma.community_posts.findUnique({
    where: { id: props.postId },
  });
  if (!post) {
    throw new HttpException("Post not found", 404);
  }
  const created = await MyGlobal.prisma.community_comments.create({
    data: await CommunityCommentCollector.collect({
      body: props.body,
      communityPosts: post,
      communityMembers: props.member,
    }),
    ...CommunityCommentTransformer.select(),
  });
  return await CommunityCommentTransformer.transform(created);
}
