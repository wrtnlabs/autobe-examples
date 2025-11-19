import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putDiscussionBoardMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IDiscussionBoardPost.IUpdate;
}): Promise<IDiscussionBoardPost> {
  // First, verify the post exists and belongs to this member
  const existingPost = await MyGlobal.prisma.discussion_board_posts.findFirst({
    where: {
      id: props.postId,
      actor_type: "member",
      deleted_at: null,
    },
    include: {
      channel: true,
      section: true,
    },
  });

  if (!existingPost) {
    throw new HttpException(
      "Post not found or you don't have permission to update it",
      404,
    );
  }

  // Verify ownership - only the original author can update
  // Note: We need to check if there's a member_id field in the post schema
  // Since the schema shows actor_type but not the specific member reference,
  // we need to check if this post was created by this member
  // This requires additional schema information about member relationships

  throw new HttpException(
    "Post ownership verification not implemented - need member relationship schema",
    500,
  );
}
