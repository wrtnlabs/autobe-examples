import { ICommunityPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPostLink";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPostLinkTransformer {
  export type Payload = Prisma.community_post_linksGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        url: true,
        domain_name: true,
        created_at: true,
        updated_at: true,
        post: true,
      },
    } satisfies Prisma.community_post_linksFindManyArgs;
  }
  export async function transform(input: Payload): Promise<ICommunityPostLink> {
    return {
      url: input.url,
      domain_name: input.domain_name,
    };
  }
}
