import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";

export async function putRedditCommunityRegisteredUserRedditCommunityCommunitiesCommunityName(props: {
  registeredUser: RegistereduserPayload;
  communityName: string;
  body: IRedditCommunityCommunity.IUpdate;
}): Promise<IRedditCommunityCommunity> {
  const existing =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { name: props.communityName },
    });

  if (!existing) {
    throw new HttpException(`Community not found: ${props.communityName}`, 404);
  }

  if (existing.creator_id !== props.registeredUser.id) {
    throw new HttpException(
      `Forbidden: user cannot update this community`,
      403,
    );
  }

  const updated = await MyGlobal.prisma.reddit_community_communities.update({
    where: { name: props.communityName },
    data: {
      ...(props.body.displayName !== undefined && {
        title: props.body.displayName,
      }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.imageUrl !== undefined && {
        imageUrl: props.body.imageUrl,
      }),
      ...(props.body.isPrivate !== undefined && {
        isPrivate: props.body.isPrivate,
      }),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    communityName: updated.name,
    displayName: updated.title,
    description: updated.description ?? "",
    imageUrl: props.body.imageUrl === null ? undefined : props.body.imageUrl,
    isPrivate: props.body.isPrivate ?? false,
    createdAt: toISOStringSafe(updated.created_at),
  };
}
