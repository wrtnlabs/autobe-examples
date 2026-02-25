import { ICommunityFileVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityFileVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityFileVariantAtSummaryTransformer {
  export type Payload = Prisma.community_file_variantsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        variant_type: true,
        width: true,
        height: true,
        storage_path: true,
        file_size: true,
        mime_type: true,
        created_at: true,
        file: {
          select: {
            id: true,
          },
        } satisfies Prisma.community_filesFindManyArgs,
      },
    } satisfies Prisma.community_file_variantsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityFileVariant.ISummary> {
    return {
      id: input.id,
      variantType: input.variant_type,
      width: input.width,
      height: input.height,
      storagePath: input.storage_path,
      fileSize: input.file_size,
      mimeType: input.mime_type,
      createdAt: input.created_at.toISOString(),
    };
  }
}
