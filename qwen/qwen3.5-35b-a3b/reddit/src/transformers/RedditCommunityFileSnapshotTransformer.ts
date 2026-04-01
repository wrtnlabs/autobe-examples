import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityFileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCommunityFileSnapshotTransformer {
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
        file: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.reddit_community_file_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityFileSnapshot> {
    return {
      id: input.id,
      fileId: input.file.id,
      snapshotCreatedAt: input.snapshot_created_at.toISOString(),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    } satisfies IRedditCommunityFileSnapshot;
  }
}
