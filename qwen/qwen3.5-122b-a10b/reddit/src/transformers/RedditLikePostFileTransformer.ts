import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikePostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostFile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditLikePostFileTransformer {
  export type Payload = Prisma.reddit_like_post_filesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        file_name: true,
        file_url: true,
        file_size: true,
        mime_type: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.reddit_like_post_filesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikePostFile> {
    return {
      id: input.id,
      file_name: input.file_name,
      file_url: input.file_url,
      file_size: input.file_size,
      mime_type: input.mime_type,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IRedditLikePostFile;
  }
}
