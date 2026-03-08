import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import { ICommunityPlatformFileVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileVersion";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommunityAtSummaryTransformer } from "./CommunityPlatformCommunityAtSummaryTransformer";
import { CommunityPlatformFileVersionTransformer } from "./CommunityPlatformFileVersionTransformer";
import { CommunityPlatformMemberAtSummaryTransformer } from "./CommunityPlatformMemberAtSummaryTransformer";
import { CommunityPlatformPostAtSummaryTransformer } from "./CommunityPlatformPostAtSummaryTransformer";

export namespace CommunityPlatformFileTransformer {
  export type Payload = Prisma.community_platform_filesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        original_name: true,
        storage_path: true,
        mime_type: true,
        file_size: true,
        width: true,
        height: true,
        file_type: true,
        created_at: true,
        updated_at: true,
        member: CommunityPlatformMemberAtSummaryTransformer.select(),
        community: CommunityPlatformCommunityAtSummaryTransformer.select(),
        post: CommunityPlatformPostAtSummaryTransformer.select(),
        versions: CommunityPlatformFileVersionTransformer.select(),
      },
    } satisfies Prisma.community_platform_filesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformFile> {
    return {
      id: input.id,
      originalName: input.original_name,
      mimeType: input.mime_type,
      fileSize: input.file_size,
      width: input.width,
      height: input.height,
      fileType: input.file_type,
      url: input.storage_path,
      member: input.member
        ? await CommunityPlatformMemberAtSummaryTransformer.transform(
            input.member,
          )
        : null,
      community: input.community
        ? await CommunityPlatformCommunityAtSummaryTransformer.transform(
            input.community,
          )
        : null,
      post: input.post
        ? await CommunityPlatformPostAtSummaryTransformer.transform(input.post)
        : null,
      versions: await ArrayUtil.asyncMap(
        input.versions,
        CommunityPlatformFileVersionTransformer.transform,
      ),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    };
  }
}
