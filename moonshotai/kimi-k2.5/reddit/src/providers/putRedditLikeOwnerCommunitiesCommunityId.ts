import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { RedditLikeCommunityTransformer } from "../transformers/RedditLikeCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditLikeOwnerCommunitiesCommunityId(props: {
  owner: OwnerPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditLikeCommunity.IUpdate;
}): Promise<IRedditLikeCommunity> {
  // Fetch community and verify it exists and is not deleted
  const community = await MyGlobal.prisma.reddit_like_communities.findUnique({
    where: {
      id: props.communityId,
      deleted_at: null,
    },
    select: {
      id: true,
      owner_id: true,
    },
  });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  // Authorization: Only owner can update
  if (community.owner_id !== props.owner.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate name uniqueness if name is being changed
  if (props.body.name !== undefined) {
    const existing = await MyGlobal.prisma.reddit_like_communities.findFirst({
      where: {
        name: props.body.name,
        id: { not: props.communityId },
        deleted_at: null,
      },
      select: { id: true },
    });
    if (existing !== null) {
      throw new HttpException("Community name already exists", 409);
    }
  }
  // Validate icon attachment if provided
  if (
    props.body.icon_attachment_id !== undefined &&
    props.body.icon_attachment_id !== null
  ) {
    const attachment = await MyGlobal.prisma.reddit_like_attachments.findUnique(
      {
        where: { id: props.body.icon_attachment_id },
        select: { id: true },
      },
    );
    if (attachment === null) {
      throw new HttpException("Invalid attachment", 400);
    }
  }
  // Build update data with only provided fields
  const updateData: Prisma.reddit_like_communitiesUpdateInput = {
    ...(props.body.name !== undefined && { name: props.body.name }),
    ...(props.body.description !== undefined && {
      description: props.body.description,
    }),
    ...(props.body.icon_attachment_id !== undefined && {
      iconAttachment:
        props.body.icon_attachment_id === null
          ? { disconnect: true }
          : { connect: { id: props.body.icon_attachment_id } },
    }),
    updated_at: new Date(),
  };
  // Perform update and return with transformer
  const updated = await MyGlobal.prisma.reddit_like_communities.update({
    where: { id: props.communityId },
    data: updateData,
    ...RedditLikeCommunityTransformer.select(),
  });
  return await RedditLikeCommunityTransformer.transform(updated);
}
