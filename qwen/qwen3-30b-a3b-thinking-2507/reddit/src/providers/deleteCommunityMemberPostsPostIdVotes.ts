import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityMemberPostsPostIdVotes(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  const vote = await MyGlobal.prisma.community_votes.findFirst({
    where: {
      post_id: props.postId,
      user_id: props.member.id,
    },
  });
  if (!vote) {
    throw new HttpException("Vote not found", 404);
  }
  await MyGlobal.prisma.community_votes.delete({
    where: { id: vote.id },
  });
}
