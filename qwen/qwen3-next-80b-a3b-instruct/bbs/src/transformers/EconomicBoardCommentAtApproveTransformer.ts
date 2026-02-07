import { IEconomicBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EconomicBoardCommentAtApproveTransformer {
  export type Payload = Prisma.economic_board_commentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        content: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        deleted_by_admin: true,
        deletion_reason: true,
        article: true,
        author: true,
      },
    } satisfies Prisma.economic_board_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomicBoardComment.IApprove> {
    return {
      commentId: input.id,
      justification: input.deletion_reason ?? undefined,
    };
  }
}
