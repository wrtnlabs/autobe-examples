import { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformProfileFileTransformer } from "../transformers/CommunityPlatformProfileFileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformMemberProfilesFilesFileId(props: {
  member: MemberPayload;
  fileId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformProfileFile> {
  props.member;
  const file =
    await MyGlobal.prisma.community_platform_profile_files.findFirstOrThrow({
      where: {
        id: props.fileId,
        deleted_at: null,
        profile: {
          deleted_at: null,
        },
      },
      select: {
        id: true,
        profile: {
          select: {
            id: true,
            community_platform_member_id: true,
            member: {
              select: {
                id: true,
              },
            },
          },
        },
        category: true,
        original_name: true,
        extension: true,
        mime_type: true,
        size: true,
        url: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (
    file.profile.member === null ||
    file.profile.community_platform_member_id !== file.profile.member.id
  ) {
    throw new HttpException("Not Found", 404);
  }
  return await CommunityPlatformProfileFileTransformer.transform(file);
}
