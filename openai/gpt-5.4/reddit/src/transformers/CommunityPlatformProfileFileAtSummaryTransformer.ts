import { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformProfileFileAtSummaryTransformer {
  export type Payload = Prisma.community_platform_profile_filesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
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
    } satisfies Prisma.community_platform_profile_filesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformProfileFile.ISummary> {
    return {
      id: input.id,
      category: input.category,
      original_name: input.original_name,
      extension: input.extension,
      mime_type: input.mime_type,
      size: input.size,
      url: input.url,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
