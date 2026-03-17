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

export async function putCommunityPlatformMemberProfilesFilesFileId(props: {
  member: MemberPayload;
  fileId: string & tags.Format<"uuid">;
  body: ICommunityPlatformProfileFile.IUpdate;
}): Promise<ICommunityPlatformProfileFile> {
  if (props.body.category !== undefined && props.body.category !== "avatar") {
    throw new HttpException("Unsupported profile file category", 400);
  }
  if (
    props.body.original_name !== undefined &&
    props.body.original_name.length === 0
  ) {
    throw new HttpException("Invalid original file name", 400);
  }
  if (props.body.extension !== undefined && props.body.extension.length === 0) {
    throw new HttpException("Invalid file extension", 400);
  }
  if (props.body.mime_type !== undefined && props.body.mime_type.length === 0) {
    throw new HttpException("Invalid mime type", 400);
  }
  if (props.body.url !== undefined && props.body.url.length === 0) {
    throw new HttpException("Invalid file url", 400);
  }
  if (props.body.size !== undefined && props.body.size <= 0) {
    throw new HttpException("Invalid file size", 400);
  }
  const file =
    await MyGlobal.prisma.community_platform_profile_files.findFirstOrThrow({
      where: {
        id: props.fileId,
        deleted_at: null,
      },
      select: {
        id: true,
        community_platform_profile_id: true,
        profile: {
          select: {
            community_platform_member_id: true,
          },
        } satisfies Prisma.community_platform_profilesFindManyArgs,
      },
    });
  if (file.profile.community_platform_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const updated = await MyGlobal.prisma.community_platform_profile_files.update(
    {
      where: {
        id: props.fileId,
      },
      data: {
        ...(props.body.category !== undefined
          ? { category: props.body.category }
          : {}),
        ...(props.body.original_name !== undefined
          ? { original_name: props.body.original_name }
          : {}),
        ...(props.body.extension !== undefined
          ? { extension: props.body.extension }
          : {}),
        ...(props.body.mime_type !== undefined
          ? { mime_type: props.body.mime_type }
          : {}),
        ...(props.body.size !== undefined ? { size: props.body.size } : {}),
        ...(props.body.url !== undefined ? { url: props.body.url } : {}),
        updated_at: new Date().toISOString(),
      },
      ...CommunityPlatformProfileFileTransformer.select(),
    },
  );
  return await CommunityPlatformProfileFileTransformer.transform(updated);
}
