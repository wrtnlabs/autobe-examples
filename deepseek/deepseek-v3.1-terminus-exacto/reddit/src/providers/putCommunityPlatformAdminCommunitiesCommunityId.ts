import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformCommunityTransformer } from "../transformers/CommunityPlatformCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformAdminCommunitiesCommunityId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunity.IUpdate;
}): Promise<ICommunityPlatformCommunity> {
  // Verify community exists and is not deleted
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId, deleted_at: null },
    });
  // Check if any fields are being updated
  const hasUpdates =
    props.body.name !== undefined ||
    props.body.description !== undefined ||
    props.body.icon_url !== undefined;
  if (!hasUpdates) {
    throw new HttpException("No fields provided for update", 400);
  }
  // Check name uniqueness if name is being updated
  if (props.body.name !== undefined && props.body.name !== community.name) {
    const existingCommunity =
      await MyGlobal.prisma.community_platform_communities.findFirst({
        where: {
          name: props.body.name,
          deleted_at: null,
          id: { not: props.communityId },
        },
      });
    if (existingCommunity) {
      throw new HttpException("Community name already exists", 400);
    }
  }
  // Build update data with only provided fields
  const updateData: Prisma.community_platform_communitiesUpdateInput = {
    ...(props.body.name !== undefined && { name: props.body.name }),
    ...(props.body.description !== undefined && {
      description: props.body.description,
    }),
    ...(props.body.icon_url !== undefined && { icon_url: props.body.icon_url }),
    updated_at: toISOStringSafe(new Date()),
  };
  // Perform update
  await MyGlobal.prisma.community_platform_communities.update({
    where: { id: props.communityId },
    data: updateData,
  });
  // Fetch updated community with transformer
  const updatedCommunity =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      ...CommunityPlatformCommunityTransformer.select(),
    });
  return await CommunityPlatformCommunityTransformer.transform(
    updatedCommunity,
  );
}
