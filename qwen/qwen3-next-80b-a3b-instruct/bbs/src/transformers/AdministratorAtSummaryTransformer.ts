import { IAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace AdministratorAtSummaryTransformer {
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
  ): Promise<IAdministrator.ISummary> {
    return {
      id: input.id,
      email: input.email,
      display_name: input.display_name ?? null,
      bio: input.bio ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
