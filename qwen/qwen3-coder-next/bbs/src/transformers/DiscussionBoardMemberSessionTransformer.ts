import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardMemberAtSummaryTransformer } from "./DiscussionBoardMemberAtSummaryTransformer";

export namespace DiscussionBoardMemberSessionTransformer {
  export type Payload = Prisma.discussion_board_member_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        access_token: true,
        expired_at: true,
        created_at: true,
        updated_at: true,
        last_active_at: true,
        ip: true,
        headers: true,
        refresh_token: true,
        token_issued_at: true,
        token_version: true,
        refresh_token_issued_at: true,
        member: DiscussionBoardMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_member_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardMemberSession> {
    return {
      id: input.id,
      access_token: input.access_token,
      expired_at: input.expired_at.toISOString(),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      last_active_at: input.last_active_at.toISOString(),
      ip: input.ip,
      headers: input.headers,
      refresh_token: input.refresh_token,
      token_issued_at: input.token_issued_at.toISOString(),
      token_version: input.token_version,
      refresh_token_issued_at: input.refresh_token_issued_at.toISOString(),
      member: await DiscussionBoardMemberAtSummaryTransformer.transform(
        input.member,
      ),
    };
  }
}
