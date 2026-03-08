import { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformFileCollector {
  export async function collect(props: {
    body: ICommunityPlatformFile.ICreate;
    communityPlatformMembers: IEntity;
    communityPlatformMemberSessions: IEntity;
  }) {
    const id: string = v4();
    const storage_path: string = `avatars/${id}`;
    return {
      id,
      original_name: props.body.original_name,
      storage_path,
      mime_type: props.body.mime_type,
      file_size: props.body.file_size,
      width: props.body.width ?? null,
      height: props.body.height ?? null,
      file_type: "avatar",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      member: {
        connect: {
          id: props.communityPlatformMembers.id,
        },
      },
      community: undefined,
      post: undefined,
      postImages: undefined,
      versions: undefined,
    } satisfies Prisma.community_platform_filesCreateInput;
  }
}
