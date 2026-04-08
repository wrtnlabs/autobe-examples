import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommentSnapshot";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCloneCommentSnapshotAtSummaryTransformer {
  export type Payload = Prisma.reddit_clone_comment_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        content: true,
        user_profile_id: true,
        reddit_clone_post_id: true,
        created_at: true,
        updated_at: true,
        snapshot_created_at: true,
        parent_comment_id: true,
        comment: true,
      },
    } satisfies Prisma.reddit_clone_comment_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneCommentSnapshot.ISummary> {
    return {
      id: input.id,
      content: input.content,
      author: {
        id: input.user_profile_id,
        display_name: "",
        bio: null,
        avatar: null,
        karma: 0,
        created_at: "1970-01-01T00:00:00.000Z",
      },
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      snapshot_created_at: input.snapshot_created_at.toISOString(),
      parent_comment_id: input.parent_comment_id ?? null,
    };
  }
}
