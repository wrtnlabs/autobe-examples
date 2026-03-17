import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentSnapshot";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityMemberAtSummaryTransformer } from "./RedditCommunityMemberAtSummaryTransformer";

export namespace RedditCommunityCommentSnapshotAtSummaryTransformer {
  export type Payload = Prisma.reddit_community_comment_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        content: true,
        version: true,
        created_at: true,
        comment: true,
        author: RedditCommunityMemberAtSummaryTransformer.select(),
        post: true,
        parentComment: true,
      },
    } satisfies Prisma.reddit_community_comment_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityCommentSnapshot.ISummary> {
    return {
      id: input.id,
      content: input.content,
      version: input.version,
      created_at: input.created_at.toISOString(),
      author: await RedditCommunityMemberAtSummaryTransformer.transform(
        input.author,
      ),
    };
  }
}
