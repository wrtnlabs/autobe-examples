import { ICommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityFile";
import { ICommunityFileVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityFileVariant";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityFileVariantAtSummaryTransformer } from "./CommunityFileVariantAtSummaryTransformer";
import { CommunityMemberAtSummaryTransformer } from "./CommunityMemberAtSummaryTransformer";

export namespace CommunityFileTransformer {
  export type Payload = Prisma.community_filesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        file_type: true,
        status: true,
        original_name: true,
        storage_path: true,
        mime_type: true,
        size: true,
        width: true,
        height: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: CommunityMemberAtSummaryTransformer.select(),
        variants: CommunityFileVariantAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_filesFindManyArgs;
  }
  export async function transform(input: Payload): Promise<ICommunityFile> {
    return {
      id: input.id,
      file_type: input.file_type,
      status: input.status,
      original_name: input.original_name,
      storage_path: input.storage_path,
      mime_type: input.mime_type,
      size: input.size,
      width: input.width,
      height: input.height,
      member: await CommunityMemberAtSummaryTransformer.transform(input.member),
      variants: await ArrayUtil.asyncMap(
        input.variants,
        CommunityFileVariantAtSummaryTransformer.transform,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
