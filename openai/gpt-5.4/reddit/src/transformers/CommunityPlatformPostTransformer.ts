import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommunityAtSummaryTransformer } from "./CommunityPlatformCommunityAtSummaryTransformer";
import { CommunityPlatformMemberAtSummaryTransformer } from "./CommunityPlatformMemberAtSummaryTransformer";
import { CommunityPlatformPostImageTransformer } from "./CommunityPlatformPostImageTransformer";
import { CommunityPlatformPostLinkTransformer } from "./CommunityPlatformPostLinkTransformer";
import { CommunityPlatformPostTextTransformer } from "./CommunityPlatformPostTextTransformer";

export namespace CommunityPlatformPostTransformer {
  export type Payload = Prisma.community_platform_postsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        post_type: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        author: CommunityPlatformMemberAtSummaryTransformer.select(),
        community: CommunityPlatformCommunityAtSummaryTransformer.select(),
        textContent: CommunityPlatformPostTextTransformer.select(),
        link: CommunityPlatformPostLinkTransformer.select(),
        postImage: CommunityPlatformPostImageTransformer.select(),
        votes: {
          select: {
            id: true,
          },
        } satisfies Prisma.community_platform_post_votesFindManyArgs,
        comments: {
          select: {
            id: true,
          },
        } satisfies Prisma.community_platform_commentsFindManyArgs,
      },
    } satisfies Prisma.community_platform_postsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformPost> {
    return {
      id: input.id,
      title: input.title,
      post_type: input.post_type,
      status: input.status,
      author: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.author,
      ),
      community: await CommunityPlatformCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      textContent: input.textContent
        ? await CommunityPlatformPostTextTransformer.transform(
            input.textContent,
          )
        : null,
      link: input.link
        ? await CommunityPlatformPostLinkTransformer.transform(input.link)
        : null,
      postImage: input.postImage
        ? await CommunityPlatformPostImageTransformer.transform(input.postImage)
        : null,
      voteScore: input.votes.length,
      commentCount: input.comments.length,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
