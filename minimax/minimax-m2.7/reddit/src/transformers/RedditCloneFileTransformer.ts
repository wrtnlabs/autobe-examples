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
import { RedditCloneFileAssociationTransformer } from "./RedditCloneFileAssociationTransformer";
import { RedditCloneFileScanTransformer } from "./RedditCloneFileScanTransformer";
import { RedditCloneFileThumbnailTransformer } from "./RedditCloneFileThumbnailTransformer";
import { RedditCloneMemberSessionAtSummaryTransformer } from "./RedditCloneMemberSessionAtSummaryTransformer";

export namespace RedditCloneFileTransformer {
  export type SelectArgs = {
    select: {
      id: true;
      original_filename: true;
      mime_type: true;
      file_size: true;
      status: true;
      created_at: true;
      updated_at: true;
      deleted_at: true;
      stored_filename: true;
      storage_path: true;
      uploader: ReturnType<
        typeof RedditCloneMemberSessionAtSummaryTransformer.select
      >;
      communityIcons: {
        select: {
          id: true;
        };
      };
      postImages: {
        select: {
          id: true;
        };
      };
      thumbnails: ReturnType<typeof RedditCloneFileThumbnailTransformer.select>;
      scans: ReturnType<typeof RedditCloneFileScanTransformer.select>;
      fileAssociation: ReturnType<
        typeof RedditCloneFileAssociationTransformer.select
      >;
    };
  };
  export type Payload = Prisma.reddit_clone_filesGetPayload<SelectArgs>;
  export function select(): SelectArgs {
    return {
      select: {
        id: true,
        original_filename: true,
        mime_type: true,
        file_size: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        stored_filename: true,
        storage_path: true,
        uploader: RedditCloneMemberSessionAtSummaryTransformer.select(),
        communityIcons: {
          select: { id: true },
        },
        postImages: {
          select: { id: true },
        },
        thumbnails: RedditCloneFileThumbnailTransformer.select(),
        scans: RedditCloneFileScanTransformer.select(),
        fileAssociation: RedditCloneFileAssociationTransformer.select(),
      },
    };
  }
  export async function transform(input: Payload): Promise<IRedditCloneFile> {
    return {
      id: input.id,
      originalFilename: input.original_filename,
      mimeType: input.mime_type,
      fileSize: input.file_size,
      status: input.status as IRedditCloneFile["status"],
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      deletedAt: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      uploader: await RedditCloneMemberSessionAtSummaryTransformer.transform(
        input.uploader,
      ),
      thumbnails: await ArrayUtil.asyncMap(
        input.thumbnails,
        RedditCloneFileThumbnailTransformer.transform,
      ),
      scans: await ArrayUtil.asyncMap(
        input.scans,
        RedditCloneFileScanTransformer.transform,
      ),
      associations: input.fileAssociation
        ? [
            await RedditCloneFileAssociationTransformer.transform(
              input.fileAssociation,
            ),
          ]
        : [],
    };
  }
}
