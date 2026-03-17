import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformMemberTransformer } from "../transformers/CommunityPlatformMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformMemberProfile(props: {
  member: MemberPayload;
  body: ICommunityPlatformMember.IUpdate;
}): Promise<ICommunityPlatformMember> {
  // Ensure member exists and is active
  const member =
    await MyGlobal.prisma.community_platform_members.findUniqueOrThrow({
      where: { id: props.member.id, deleted_at: null },
    });
  // Prepare update data
  const updateData: any = {
    updated_at: new Date().toISOString(),
  };
  if (props.body.display_name !== undefined) {
    updateData.nickname = props.body.display_name;
  }
  if (props.body.avatar_image_id !== undefined) {
    if (props.body.avatar_image_id === null) {
      // Clear avatar - no connection
    } else {
      // Verify file exists and belongs to member
      const file =
        await MyGlobal.prisma.community_platform_files.findUniqueOrThrow({
          where: {
            id: props.body.avatar_image_id,
            actor_type: "member",
            actor_id: props.member.id,
            deleted_at: null,
          },
        });
      updateData.avatar_image_id = props.body.avatar_image_id;
    }
  }
  // Update member
  await MyGlobal.prisma.community_platform_members.update({
    where: { id: props.member.id },
    data: updateData,
  });
  // Fetch updated member with transformer
  const updated =
    await MyGlobal.prisma.community_platform_members.findUniqueOrThrow({
      where: { id: props.member.id },
      ...CommunityPlatformMemberTransformer.select(),
    });
  return await CommunityPlatformMemberTransformer.transform(updated);
}
