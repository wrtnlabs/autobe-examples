import { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EconomicBoardAdministratorTransformer {
  export type Payload = Prisma.economic_board_administratorsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        display_name: true,
        bio: true,
        is_banned: true,
        ban_reason: true,
        admin_request_status: true,
        admin_request_reason: true,
        created_at: true,
        updated_at: true,
        administratorSessions: true,
        sessions: true,
        auditLogs: true,
        passwordResets: true,
        superAdministratorPasswordResets: true,
        sectionSnapshots: true,
      },
    } satisfies Prisma.economic_board_administratorsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomicBoardAdministrator> {
    return {
      id: input.id,
      email: input.email,
      display_name: input.display_name ?? undefined,
      bio: input.bio ?? undefined,
      is_banned: input.is_banned,
      ban_reason: input.ban_reason ?? null,
      admin_request_status: typia.assert<"pending" | "approved" | "rejected">(
        input.admin_request_status,
      ),
      admin_request_reason: input.admin_request_reason ?? null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
    };
  }
}
