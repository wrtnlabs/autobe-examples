import { ICommunityPlatformAvatarFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAvatarFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformAvatarFileCollector {
  export async function collect(props: {
    body: ICommunityPlatformAvatarFile.ICreate;
    communityPlatformMembers: IEntity;
    communityPlatformMemberSessions: IEntity;
  }) {
    const id: string = v4();
    // Decode base64 content to calculate file size
    const fileBuffer: Buffer = Buffer.from(props.body.file, "base64");
    const file_size: number = fileBuffer.length;
    // Extract file extension from MIME type
    const extension: string = props.body.mimeType.split("/")[1] ?? "png";
    const storage_path: string = `avatars/${id}.${extension}`;
    return {
      id,
      original_name: props.body.originalName,
      storage_path,
      mime_type: props.body.mimeType,
      file_size,
      width: props.body.width ?? null,
      height: props.body.height ?? null,
      file_type: "avatar",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      member: { connect: { id: props.communityPlatformMembers.id } },
      community: undefined,
      post: undefined,
      postImages: undefined,
      versions: undefined,
    } satisfies Prisma.community_platform_filesCreateInput;
  }
}
