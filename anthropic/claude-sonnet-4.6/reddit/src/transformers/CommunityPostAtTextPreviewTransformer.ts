import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPostAtTextPreviewTransformer {
  export type Payload = Prisma.community_post_textsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        body: true,
      },
    } satisfies Prisma.community_post_textsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPost.ITextPreview> {
    return {
      type: "text",
      snippet: input.body.substring(0, 200),
    };
  }
}
