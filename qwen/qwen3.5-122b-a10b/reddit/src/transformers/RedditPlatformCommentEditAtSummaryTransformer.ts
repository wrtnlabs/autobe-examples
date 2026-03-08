import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommentEdit } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentEdit";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditPlatformMemberAtSummaryTransformer } from "./RedditPlatformMemberAtSummaryTransformer";

export namespace RedditPlatformCommentEditAtSummaryTransformer {
  export type Payload = Prisma.reddit_platform_comment_editsGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformCommentEdit.ISummary> {
    return {
      id: input.id,
      old_content: input.old_content,
      new_content: input.new_content,
      author: await RedditPlatformMemberAtSummaryTransformer.transform(
        input.member,
      ),
      created_at: input.created_at.toISOString(),
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        old_content: true,
        new_content: true,
        created_at: true,
        member: RedditPlatformMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_platform_comment_editsFindManyArgs;
  }
}
