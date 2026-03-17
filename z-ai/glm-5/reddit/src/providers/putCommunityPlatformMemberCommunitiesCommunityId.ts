import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformCommunityTransformer } from "../transformers/CommunityPlatformCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformMemberCommunitiesCommunityId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunity.IUpdate;
}): Promise<ICommunityPlatformCommunity> {
  // Find community and verify existence
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      select: { id: true, owner_member_id: true },
    });
  // Verify ownership
  if (community.owner_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Check name uniqueness (excluding current community)
  const existingCommunity =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: {
        name: props.body.name,
        id: { not: props.communityId },
        deleted_at: null,
      },
    });
  if (existingCommunity !== null) {
    throw new HttpException("Community name already exists", 409);
  }
  // Verify icon file if provided
  if (
    props.body.icon_file_id !== undefined &&
    props.body.icon_file_id !== null
  ) {
    const iconFile = await MyGlobal.prisma.community_platform_files.findUnique({
      where: { id: props.body.icon_file_id },
    });
    if (iconFile === null) {
      throw new HttpException("Icon file not found", 404);
    }
  }
  // Update community
  await MyGlobal.prisma.community_platform_communities.update({
    where: { id: props.communityId },
    data: {
      name: props.body.name,
      description: props.body.description,
      ...(props.body.icon_file_id !== undefined && {
        icon_file_id: props.body.icon_file_id,
      }),
      updated_at: new Date(),
    },
  });
  // Fetch and transform response
  const updated =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      ...CommunityPlatformCommunityTransformer.select(),
    });
  return await CommunityPlatformCommunityTransformer.transform(updated);
}
