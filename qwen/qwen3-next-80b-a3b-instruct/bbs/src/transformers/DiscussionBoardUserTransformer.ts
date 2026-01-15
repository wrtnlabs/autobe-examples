import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardUserTransformer {
  export type Payload = Prisma.discussion_board_usersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        display_name: true,
        bio: true,
      },
    } satisfies Prisma.discussion_board_usersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardUser> {
    const username = input.display_name
      ? input.display_name
      : input.email.split("@")[0];
    return {
      id: input.id,
      email: input.email,
      username: username,
      display_name: input.display_name ?? undefined,
      bio: input.bio ?? undefined,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
    };
  }
}
