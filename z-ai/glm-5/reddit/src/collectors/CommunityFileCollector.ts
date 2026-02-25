import { ICommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityFileCollector {
  export async function collect(props: {
    body: ICommunityFile.ICreate & {
      original_name: string;
      storage_path: string;
      mime_type: string;
      size: number;
      width?: number | null;
      height?: number | null;
    };
    communityMembers: IEntity;
    communityMemberSessions: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      file_type: props.body.file_type,
      status: "TEMPORARY",
      original_name: props.body.original_name,
      storage_path: props.body.storage_path,
      mime_type: props.body.mime_type,
      size: props.body.size,
      width: props.body.width ?? null,
      height: props.body.height ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      member: { connect: { id: props.communityMembers.id } },
    } satisfies Prisma.community_filesCreateInput;
  }
}
