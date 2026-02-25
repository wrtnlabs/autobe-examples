import { ICommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityFile";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityMemberAtSummaryTransformer } from "./CommunityMemberAtSummaryTransformer";

export namespace CommunityFileAtSummaryTransformer {
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
        mime_type: true,
        size: true,
        width: true,
        height: true,
        created_at: true,
        updated_at: true,
        member: CommunityMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_filesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityFile.ISummary> {
    return {
      id: input.id,
      fileType: input.file_type,
      status: input.status,
      originalName: input.original_name,
      mimeType: input.mime_type,
      size: input.size,
      width: input.width,
      height: input.height,
      member: await CommunityMemberAtSummaryTransformer.transform(input.member),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    };
  }
}
