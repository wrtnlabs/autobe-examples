import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneModerationReportContentType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationReportContentType";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCloneModerationReportContentTypeTransformer {
  export type Payload =
    Prisma.reddit_clone_moderation_report_content_typesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        reports: true,
      },
    } satisfies Prisma.reddit_clone_moderation_report_content_typesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneModerationReportContentType> {
    return {
      id: input.id,
      code: input.code,
      name: input.name,
      description: input.description ?? null,
    };
  }
}
