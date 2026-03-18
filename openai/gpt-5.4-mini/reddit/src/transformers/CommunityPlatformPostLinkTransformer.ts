import { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformPostLinkTransformer {
  export type Payload = Prisma.community_platform_post_linksGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        domain_name: true,
        title: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        url: true,
        post: true,
      },
    } satisfies Prisma.community_platform_post_linksFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformPostLink> {
    return {
      url: Boolean(input.url),
    };
  }
}
