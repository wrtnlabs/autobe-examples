import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommunityAtSummaryTransformer } from "./CommunityPlatformCommunityAtSummaryTransformer";

export namespace CommunityPlatformCommunityImageAtSummaryTransformer {
  export type Payload = Prisma.community_platform_community_imagesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        uri: true,
        filename: true,
        content_type: true,
        width: true,
        height: true,
        size_bytes: true,
        ordering: true,
        active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        community: CommunityPlatformCommunityAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_platform_community_imagesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformCommunityImage.ISummary> {
    return {
      id: input.id,
      uri: input.uri,
      filename: input.filename,
      contentType: input.content_type,
      width: input.width,
      height: input.height,
      sizeBytes: input.size_bytes,
      ordering: input.ordering,
      active: input.active,
      createdAt: input.created_at.toISOString(),
      community: await CommunityPlatformCommunityAtSummaryTransformer.transform(
        input.community,
      ),
    };
  }
}
