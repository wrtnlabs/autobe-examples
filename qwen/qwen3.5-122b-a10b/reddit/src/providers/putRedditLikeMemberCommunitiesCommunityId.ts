import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeCommunityTransformer } from "../transformers/RedditLikeCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditLikeMemberCommunitiesCommunityId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditLikeCommunity.IUpdate;
}): Promise<IRedditLikeCommunity> {
  const community =
    await MyGlobal.prisma.reddit_like_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      select: { id: true, owner_id: true },
    });
  if (community.owner_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (props.body.name !== undefined) {
    const existing = await MyGlobal.prisma.reddit_like_communities.findFirst({
      where: {
        name: props.body.name,
        id: { not: props.communityId },
        deleted_at: null,
      },
    });
    if (existing !== null) {
      throw new HttpException("Community name already exists", 409);
    }
  }
  await MyGlobal.prisma.reddit_like_communities.update({
    where: { id: props.communityId },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.icon_url !== undefined && {
        icon_url: props.body.icon_url,
      }),
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.reddit_like_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      ...RedditLikeCommunityTransformer.select(),
    });
  return await RedditLikeCommunityTransformer.transform(updated);
}
