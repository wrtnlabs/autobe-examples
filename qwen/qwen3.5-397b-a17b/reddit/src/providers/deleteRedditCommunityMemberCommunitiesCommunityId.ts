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

export async function deleteRedditCommunityMemberCommunitiesCommunityId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<void> {
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      select: { id: true, owner_id: true, deleted_at: true },
    });
  if (community.deleted_at !== null) {
    throw new HttpException("Community already deleted", 400);
  }
  if (community.owner_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.reddit_community_communities.update({
    where: { id: props.communityId },
    data: { deleted_at: new Date() },
  });
}
