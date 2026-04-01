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

export async function deleteRedditLikeMemberCommunitiesCommunityId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find community and verify it exists (not deleted)
  const community = await MyGlobal.prisma.reddit_like_communities.findUnique({
    where: { id: props.communityId },
    select: { id: true, owner_id: true, deleted_at: true },
  });
  if (community === null || community.deleted_at !== null) {
    throw new HttpException("Community not found", 404);
  }
  // Verify requesting member is the owner
  if (community.owner_id !== props.member.id) {
    throw new HttpException(
      "Forbidden: Only the community owner can delete this community",
      403,
    );
  }
  // Soft delete by setting deleted_at
  await MyGlobal.prisma.reddit_like_communities.update({
    where: { id: props.communityId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
}
