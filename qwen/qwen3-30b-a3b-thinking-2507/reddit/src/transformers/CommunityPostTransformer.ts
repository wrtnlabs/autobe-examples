import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityCommunityAtSummaryTransformer } from "./CommunityCommunityAtSummaryTransformer";
import { CommunityMemberAtSummaryTransformer } from "./CommunityMemberAtSummaryTransformer";

export namespace CommunityPostTransformer {
  export type Payload = Prisma.community_postsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        type: true,
        content: true,
        url: true,
        image_url: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        author: { select: CommunityMemberAtSummaryTransformer.select() },
        community: { select: CommunityCommunityAtSummaryTransformer.select() },
        community_comments: { select: {} },
        community_votes: { select: {} },
        community_reports: { select: {} },
      },
    } satisfies Prisma.community_postsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<ICommunityPost> {
    return {
      id: input.id,
      title: input.title,
      type: input.type as "text" | "link" | "image",
      content: input.content,
      url: input.url,
      image_url: input.image_url,
      author: await CommunityMemberAtSummaryTransformer.transform(input.author),
      community: await CommunityCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
