import { ICommunityPlatformPostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostTextContent";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformPostTextContentAtTextTransformer {
  export type Payload = Prisma.community_platform_post_text_contentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        content: true,
        content_length: true,
        format_type: true,
        last_edited_at: true,
        edit_count: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        post: true,
      },
    } satisfies Prisma.community_platform_post_text_contentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformPostTextContent.IText> {
    return {
      content: input.content,
      content_length: input.content_length,
      format_type: input.format_type,
      last_edited_at: input.last_edited_at?.toISOString() ?? null,
      edit_count: input.edit_count,
    };
  }
}
