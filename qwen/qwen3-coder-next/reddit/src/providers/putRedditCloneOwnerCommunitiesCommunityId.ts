import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { RedditCloneCommunityTransformer } from "../transformers/RedditCloneCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCloneOwnerCommunitiesCommunityId(props: {
  owner: OwnerPayload;
  communityId: string;
  body: IRedditCloneCommunity.IUpdate;
}): Promise<IRedditCloneCommunity> {
  const community = await MyGlobal.prisma.reddit_clone_communities.findFirst({
    where: {
      id: props.communityId,
      owner_id: props.owner.id,
    },
  });
  if (community === null) {
    throw new HttpException("Community not found or access denied", 404);
  }
  if (props.body.name && props.body.name !== community.name) {
    const existing = await MyGlobal.prisma.reddit_clone_communities.findFirst({
      where: {
        name: props.body.name,
        id: { not: props.communityId },
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
      ...(props.body.icon_url !== undefined && {
        icon_url: props.body.icon_url,
      }),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  const updated =
    await MyGlobal.prisma.reddit_clone_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      ...RedditCloneCommunityTransformer.select(),
    });
  return await RedditCloneCommunityTransformer.transform(updated);
}
