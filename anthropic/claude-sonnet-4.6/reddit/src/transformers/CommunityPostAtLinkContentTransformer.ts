import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPostAtLinkContentTransformer {
  export type Payload = Prisma.community_post_linksGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        url: true,
        domain: true,
      },
    } satisfies Prisma.community_post_linksFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPost.ILinkContent> {
    return {
      type: "link",
      url: input.url,
      domain: input.domain,
    };
  }
}
