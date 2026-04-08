import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityCommunityTransformer } from "../transformers/RedditCommunityCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCommunityMemberCommunitiesCommunityId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditCommunityCommunity.IUpdate;
}): Promise<IRedditCommunityCommunity> {
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUniqueOrThrow({
      where: { id: props.communityId, deleted_at: null },
      select: { id: true, owner_id: true },
    });
  if (community.owner_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (props.body.name !== undefined) {
    const existing =
      await MyGlobal.prisma.reddit_community_communities.findFirst({
        where: {
          name: props.body.name,
          deleted_at: null,
          id: { not: props.communityId },
        },
      });
    if (existing) {
      throw new HttpException("Conflict", 409);
    }
  }
  await MyGlobal.prisma.reddit_community_communities.update({
    where: { id: props.communityId },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.icon !== undefined && { icon: props.body.icon }),
      updated_at: new Date().toISOString(),
    },
  });
  const updated =
    await MyGlobal.prisma.reddit_community_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      ...RedditCommunityCommunityTransformer.select(),
    });
  return await RedditCommunityCommunityTransformer.transform(updated);
}
