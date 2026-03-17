import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityCommentDeletion } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentDeletion";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMemberSession";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityCommentAtSummaryTransformer } from "./RedditCommunityCommentAtSummaryTransformer";
import { RedditCommunityMemberSessionAtSummaryTransformer } from "./RedditCommunityMemberSessionAtSummaryTransformer";

export namespace RedditCommunityCommentDeletionTransformer {
  export type Payload = Prisma.reddit_community_comment_deletionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        deleted_at: true,
        deletion_reason: true,
        created_at: true,
        updated_at: true,
        comment: RedditCommunityCommentAtSummaryTransformer.select(),
        deletedBy: RedditCommunityMemberSessionAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_community_comment_deletionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityCommentDeletion> {
    return {
      id: input.id,
      deleted_at: input.deleted_at.toISOString(),
      deletion_reason: input.deletion_reason ?? undefined,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      comment: await RedditCommunityCommentAtSummaryTransformer.transform(
        input.comment,
      ),
      deletedBy: input.deletedBy
        ? await RedditCommunityMemberSessionAtSummaryTransformer.transform(
            input.deletedBy,
          )
        : null,
    };
  }
}
