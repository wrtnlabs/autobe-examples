import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommentDeletion } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentDeletion";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMemberSession";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityMemberSessionAtSummaryTransformer } from "./RedditCommunityMemberSessionAtSummaryTransformer";

export namespace RedditCommunityCommentDeletionAtSummaryTransformer {
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
        comment: true,
        deletedBy: RedditCommunityMemberSessionAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_community_comment_deletionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityCommentDeletion.ISummary> {
    return {
      id: input.id,
      deleted_at: input.deleted_at.toISOString(),
      deleted_by: input.deletedBy
        ? await RedditCommunityMemberSessionAtSummaryTransformer.transform(
            input.deletedBy,
          )
        : null,
      deletion_reason: input.deletion_reason ?? undefined,
    };
  }
}
