import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneCommunityTransformer } from "../transformers/RedditCloneCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCloneCommunitiesCommunityId(props: {
  communityId: string & tags.Format<"uuid">;
  body: IRedditCloneCommunity.IUpdate;
}): Promise<IRedditCloneCommunity> {
  const community =
    await MyGlobal.prisma.reddit_clone_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      select: { id: true, deleted_at: true, owner_id: true, name: true },
    });
  if (community.deleted_at !== null) {
    throw new HttpException("Community has been deleted", 404);
  }
  if (props.body.name !== undefined && props.body.name !== community.name) {
    const existing = await MyGlobal.prisma.reddit_clone_communities.findFirst({
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
  await MyGlobal.prisma.reddit_clone_communities.update({
    where: { id: props.communityId },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.icon !== undefined && { icon: props.body.icon }),
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.reddit_clone_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      ...RedditCloneCommunityTransformer.select(),
    });
  return await RedditCloneCommunityTransformer.transform(updated);
}
