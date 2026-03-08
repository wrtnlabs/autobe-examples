import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformMemberAtSummaryTransformer } from "./CommunityPlatformMemberAtSummaryTransformer";

export namespace CommunityPlatformPostSnapshotTransformer {
  export type Payload = Prisma.community_platform_post_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        content_type: true,
        text_content: true,
        link_url: true,
        image_url: true,
        score: true,
        comment_count: true,
        updated_at: true,
        created_at: true,
        editor: CommunityPlatformMemberAtSummaryTransformer.select(),
        post: {
          select: {
            id: true,
          },
        } satisfies Prisma.community_platform_postsFindManyArgs,
      },
    } satisfies Prisma.community_platform_post_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformPostSnapshot> {
    return {
      id: input.id,
      post_id: input.post.id,
      editor: await CommunityPlatformMemberAtSummaryTransformer.transform(
        input.editor,
      ),
      title: input.title,
      content_type: input.content_type,
      text_content: input.text_content ?? null,
      link_url: input.link_url ?? null,
      image_url: input.image_url ?? null,
      score: input.score,
      comment_count: input.comment_count,
      updated_at: input.updated_at.toISOString(),
      created_at: input.created_at.toISOString(),
    };
  }
}
