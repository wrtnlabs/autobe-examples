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
  // Fetch community and verify it exists and is not soft-deleted
  const community = await MyGlobal.prisma.reddit_like_communities.findFirst({
    where: {
      id: props.communityId,
      deleted_at: null,
    },
    select: {
      id: true,
      owner_id: true,
      name: true,
    },
  });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  // Verify ownership
  if (community.owner_id !== props.owner.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Check name uniqueness if name is being changed
  if (props.body.name !== undefined && props.body.name !== community.name) {
    const existingCommunity =
      await MyGlobal.prisma.reddit_like_communities.findUnique({
        where: { name: props.body.name },
        select: { id: true },
      });
    if (existingCommunity !== null) {
      throw new HttpException("Community name already in use", 409);
    }
  }
  // Validate attachment exists if provided
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
      throw new HttpException("Attachment not found", 400);
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
  // Perform update
  await MyGlobal.prisma.reddit_like_communities.update({
    where: { id: props.communityId },
    data: updateData,
  });
  // Fetch updated community with full relations for response
  const updatedCommunity =
    await MyGlobal.prisma.reddit_like_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      ...RedditLikeCommunityTransformer.select(),
    });
  return await RedditLikeCommunityTransformer.transform(updatedCommunity);
}
