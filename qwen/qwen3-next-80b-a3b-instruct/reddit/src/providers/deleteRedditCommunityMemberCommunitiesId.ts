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

export async function deleteRedditCommunityMemberCommunitiesId(props: {
  member: MemberPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { id: props.id },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  if (community.owner_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.reddit_community_bans.deleteMany({
      where: { community_id: props.id },
    }),
    MyGlobal.prisma.reddit_community_user_communities.deleteMany({
      where: { reddit_community_community_id: props.id },
    }),
    MyGlobal.prisma.reddit_community_communities.delete({
      where: { id: props.id },
    }),
  ]);
}
