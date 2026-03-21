import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneMemberSessionAtSummaryTransformer } from "./RedditCloneMemberSessionAtSummaryTransformer";

export namespace RedditCloneFileAtSummaryTransformer {
  // 1. Payload type first
  export type Payload = Prisma.reddit_clone_filesGetPayload<
    ReturnType<typeof select>
  >;
  // 2. select() function second
  export function select() {
    return {
      select: {
        id: true,
        original_filename: true,
        mime_type: true,
        file_size: true,
        status: true,
        created_at: true,
        uploader: RedditCloneMemberSessionAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_clone_filesFindManyArgs;
  }
  // 3. transform() function last
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneFile.ISummary> {
    return {
      id: input.id,
      originalFilename: input.original_filename,
      mimeType: input.mime_type,
      fileSize: input.file_size,
      status: input.status,
      createdAt: toISOStringSafe(input.created_at),
      uploader: await RedditCloneMemberSessionAtSummaryTransformer.transform(
        input.uploader,
      ),
    };
  }
}
