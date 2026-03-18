import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityPlatformAdminPostsPostIdVotesVoteId(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  voteId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, postId, voteId } = props;
  const prisma = (
    MyGlobal as unknown as {
      prisma: {
        community_platform_post_vote: {
          findFirst: (args: unknown) => Promise<unknown>;
          delete: (args: unknown) => Promise<unknown>;
        };
      };
    }
  ).prisma;
  const vote = await prisma.community_platform_post_vote.findFirst({
    where: {
      id: voteId,
      post_id: postId,
    },
  } as unknown);
  if (!vote) {
    throw new HttpException("Vote not found", 404);
  }
  await prisma.community_platform_post_vote.delete({
    where: { id: voteId },
  } as unknown);
}
