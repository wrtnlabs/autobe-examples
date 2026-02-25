import { ICommunityPlatformPostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostTextContent";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformPostTextContentAtLinkTransformer {
  export type Payload = Prisma.community_platform_post_link_contentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        url: true,
        domain: true,
        title: true,
        description: true,
        image_url: true,
        created_at: true,
        updated_at: true,
        post: true,
      },
    } satisfies Prisma.community_platform_post_link_contentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformPostTextContent.ILink> {
    return {
      id: input.id,
      url: input.url,
      domain: input.domain,
      title: input.title ?? undefined,
      description: input.description ?? undefined,
      image_url: input.image_url ?? undefined,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
