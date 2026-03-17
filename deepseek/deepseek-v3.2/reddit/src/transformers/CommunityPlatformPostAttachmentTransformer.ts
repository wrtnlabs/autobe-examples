import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostAttachment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformFileTransformer } from "./CommunityPlatformFileTransformer";
import { CommunityPlatformPostAtSummaryTransformer } from "./CommunityPlatformPostAtSummaryTransformer";

export namespace CommunityPlatformPostAttachmentTransformer {
  export type Payload = Prisma.community_platform_post_attachmentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        position: true,
        file_type: true,
        original_filename: true,
        file_size: true,
        mime_type: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        post: CommunityPlatformPostAtSummaryTransformer.select(),
        file: CommunityPlatformFileTransformer.select(),
      },
    } satisfies Prisma.community_platform_post_attachmentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformPostAttachment> {
    return {
      id: input.id,
      position: input.position,
      file_type: input.file_type as "image" | "document" | "video" | "audio",
      original_filename: input.original_filename,
      file_size: input.file_size,
      mime_type: input.mime_type,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      file: await CommunityPlatformFileTransformer.transform(input.file),
      post: await CommunityPlatformPostAtSummaryTransformer.transform(
        input.post,
      ),
    };
  }
}
