import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostSnapshot";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityMemberAtSummaryTransformer } from "./RedditCommunityMemberAtSummaryTransformer";

export namespace RedditCommunityPostSnapshotAtSummaryTransformer {
  export type Payload = Prisma.reddit_community_post_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        post_type: true,
        text_body: true,
        link_url: true,
        image_file_id: true,
        vote_score: true,
        comment_count: true,
        created_at: true,
        editedByMember: RedditCommunityMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_community_post_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityPostSnapshot.ISummary> {
    return {
      id: input.id,
      title: input.title,
      post_type: input.post_type,
      text_body: input.text_body,
      link_url: input.link_url,
      image_file_id: input.image_file_id,
      vote_score: input.vote_score,
      comment_count: input.comment_count,
      edited_by_member_id: input.editedByMember.id,
      edited_by_member:
        await RedditCommunityMemberAtSummaryTransformer.transform(
          input.editedByMember,
        ),
      created_at: toISOStringSafe(input.created_at),
    } satisfies IRedditCommunityPostSnapshot.ISummary;
  }
}
