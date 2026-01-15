import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardMemberTransformer {
  export type Payload = Prisma.discussion_board_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.discussion_board_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardMember> {
    return {
      id: input.id,
      name: input.name ?? "",
      email: input.email,
      status: input.status,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
