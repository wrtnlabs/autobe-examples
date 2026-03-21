import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneMemberSessionAtSummaryTransformer } from "./RedditCloneMemberSessionAtSummaryTransformer";

export namespace RedditCloneFileAssociationTransformer {
  export type Payload = Prisma.reddit_clone_file_associationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        target_type: true,
        target_id: true,
        created_at: true,
        updated_at: true,
        file: {
          select: {
            id: true,
            original_filename: true,
            mime_type: true,
            file_size: true,
            status: true,
            created_at: true,
            updated_at: true,
            uploader: RedditCloneMemberSessionAtSummaryTransformer.select(),
          },
        },
        userProfileAvatar: {
          select: { id: true },
        },
      },
    } satisfies Prisma.reddit_clone_file_associationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneFileAssociation> {
    return {
      id: input.id,
      file: {
        id: input.file.id,
        originalFilename: input.file.original_filename,
        mimeType: input.file.mime_type,
        fileSize: input.file.file_size,
        status: input.file.status as IRedditCloneFile["status"],
        uploader: await RedditCloneMemberSessionAtSummaryTransformer.transform(
          input.file.uploader,
        ),
        thumbnails: [],
        scans: [],
        associations: [],
        createdAt: toISOStringSafe(input.file.created_at),
        updatedAt: toISOStringSafe(input.file.updated_at),
        deletedAt: null,
      },
      target_id: input.target_id,
      target_type: input.target_type as "user" | "community" | "post",
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
    };
  }
}
