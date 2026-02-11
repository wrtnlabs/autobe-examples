import { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityCommentAtSummaryTransformer } from "./CommunityCommentAtSummaryTransformer";
import { CommunityMemberAtSummaryTransformer } from "./CommunityMemberAtSummaryTransformer";
import { CommunityPostAtSummaryTransformer } from "./CommunityPostAtSummaryTransformer";

export namespace CommunityCommentTransformer {
  export type Payload = Prisma.community_commentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        content: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        author: CommunityMemberAtSummaryTransformer.select(),
        post: CommunityPostAtSummaryTransformer.select(),
        parent: CommunityCommentAtSummaryTransformer.select(),
        community_votes: { _count: true },
        community_reports: { _count: true },
        recursive: true,
      },
    } satisfies Prisma.community_commentsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<ICommunityComment> {
    return {
      id: input.id,
      author: await CommunityMemberAtSummaryTransformer.transform(input.author),
      post: await CommunityPostAtSummaryTransformer.transform(input.post),
      parent: input.parent
        ? await CommunityCommentAtSummaryTransformer.transform(input.parent)
        : null,
      content: input.content,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
