import { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformFileTransformer {
  export type Payload = Prisma.community_platform_filesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        type: true,
        size: true,
        storage_path: true,
        public_url: true,
        status: true,
        actor_type: true,
        actor_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        fileProcesses: true, // hasMany relation - not used in DTO but must be selected
        tempUploads: true, // hasMany relation - not used in DTO but must be selected
        postAttachment: true, // hasOne relation - not used in DTO but must be selected
      },
    } satisfies Prisma.community_platform_filesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformFile> {
    return {
      id: input.id,
      name: input.name,
      type: input.type,
      size: input.size,
      storage_path: input.storage_path,
      public_url: input.public_url ?? undefined,
      status: input.status,
      actor_type: input.actor_type,
      actor_id: input.actor_id,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at ? input.deleted_at.toISOString() : null,
    };
  }
}
