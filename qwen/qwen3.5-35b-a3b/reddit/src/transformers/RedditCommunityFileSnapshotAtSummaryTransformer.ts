import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFile";
import { IRedditCommunityFileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityFileAtSummaryTransformer } from "./RedditCommunityFileAtSummaryTransformer";

export namespace RedditCommunityFileSnapshotAtSummaryTransformer {
  export type Payload = Prisma.reddit_community_file_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        snapshot_created_at: true,
        created_at: true,
        updated_at: true,
        file: RedditCommunityFileAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_community_file_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityFileSnapshot.ISummary> {
    return {
      id: input.id,
      snapshot_created_at: input.snapshot_created_at.toISOString(),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      file: await RedditCommunityFileAtSummaryTransformer.transform(input.file),
    };
  }
}
