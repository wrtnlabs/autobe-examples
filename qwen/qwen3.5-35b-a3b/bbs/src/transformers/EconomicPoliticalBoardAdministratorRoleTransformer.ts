import { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EconomicPoliticalBoardAdministratorRoleTransformer {
  export type Payload =
    Prisma.economic_political_board_administrator_rolesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        grade: true,
        promoted_at: true,
        created_at: true,
        updated_at: true,
        user: {
          select: {
            id: true,
            user_id: true,
          },
        } satisfies Prisma.economic_political_board_administrator_rolesFindManyArgs,
        promotedByUser: {
          select: {
            id: true,
            grade: true,
            promoted_at: true,
            created_at: true,
            updated_at: true,
            user_id: true,
          },
        } satisfies Prisma.economic_political_board_administrator_rolesFindManyArgs,
        promotedAdministrators: {
          select: {
            id: true,
            grade: true,
            promoted_at: true,
            created_at: true,
            updated_at: true,
            user_id: true,
          },
        } satisfies Prisma.economic_political_board_administrator_rolesFindManyArgs,
        administratorRequests: true,
        reviewedAdministratorRequests: true,
        administratorRole: true,
        articles: true,
        comments: true,
        banRecords: true,
        issuedBans: true,
      },
    } satisfies Prisma.economic_political_board_administrator_rolesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomicPoliticalBoardAdministratorRole> {
    const promoted_at = input.promoted_at
      ? toISOStringSafe(input.promoted_at)
      : undefined;
    const promotedByUser = input.promotedByUser
      ? ({
          id: input.promotedByUser.id,
          grade: typia.assert<"regular" | "super">(input.promotedByUser.grade),
          promotedByUserId: input.promotedByUser.user_id,
          promotedAt: input.promotedByUser.promoted_at
            ? toISOStringSafe(input.promotedByUser.promoted_at)
            : null,
          createdAt: toISOStringSafe(input.promotedByUser.created_at),
          updatedAt: toISOStringSafe(input.promotedByUser.updated_at),
        } as IEconomicPoliticalBoardAdministratorRole.ISummary)
      : undefined;
    const promotedAdministrators = input.promotedAdministrators
      ? await ArrayUtil.asyncMap(
          input.promotedAdministrators,
          (admin) =>
            ({
              id: admin.id,
              grade: typia.assert<"regular" | "super">(admin.grade),
              promotedByUserId: admin.user_id,
              promotedAt: admin.promoted_at
                ? toISOStringSafe(admin.promoted_at)
                : null,
              createdAt: toISOStringSafe(admin.created_at),
              updatedAt: toISOStringSafe(admin.updated_at),
            }) as IEconomicPoliticalBoardAdministratorRole.ISummary,
        )
      : undefined;
    return {
      id: input.id,
      grade: typia.assert<"regular" | "super">(input.grade),
      promoted_at,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      user: {
        id: input.user.id,
        email: "",
        displayName: "",
        bio: "",
      },
      promotedByUser,
      promotedAdministrators,
    };
  }
}
