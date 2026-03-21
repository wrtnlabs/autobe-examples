import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneFileAtSummaryTransformer } from "./RedditCloneFileAtSummaryTransformer";

export namespace RedditCloneFileScanTransformer {
  export type Payload = Prisma.reddit_clone_file_scansGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        scanned_at: true,
        scanner: true,
        status: true,
        threat_name: true,
        details: true,
        created_at: true,
        updated_at: true,
        file: RedditCloneFileAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_clone_file_scansFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneFileScan> {
    return {
      id: input.id,
      scanned_at: input.scanned_at.toISOString(),
      scanner: input.scanner,
      status: input.status,
      threat_name: input.threat_name ?? null,
      details: input.details ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      file: await RedditCloneFileAtSummaryTransformer.transform(input.file),
    };
  }
}
