import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformTempUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformTempUpload";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformFileAtSummaryTransformer } from "./CommunityPlatformFileAtSummaryTransformer";
import { CommunityPlatformMemberAtSummaryTransformer } from "./CommunityPlatformMemberAtSummaryTransformer";

export namespace CommunityPlatformTempUploadAtSummaryTransformer {
  export type Payload = Prisma.community_platform_temp_uploadsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        original_filename: true,
        mime_type: true,
        file_size: true,
        content_hash: true,
        upload_ip: true,
        user_agent: true,
        expires_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        file: CommunityPlatformFileAtSummaryTransformer.select(),
        uploader: CommunityPlatformMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_platform_temp_uploadsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformTempUpload.ISummary> {
    return {
      id: input.id,
      status: input.status,
      original_filename: input.original_filename,
      mime_type: input.mime_type,
      file_size: input.file_size,
      content_hash: input.content_hash,
      expires_at: input.expires_at.toISOString(),
      created_at: input.created_at.toISOString(),
      file: await CommunityPlatformFileAtSummaryTransformer.transform(
        input.file,
      ),
      uploader: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.uploader,
      ),
    };
  }
}
