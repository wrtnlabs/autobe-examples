import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallAdministratorGradeAtSummaryTransformer } from "./ShoppingMallAdministratorGradeAtSummaryTransformer";

export namespace ShoppingMallAdministratorTransformer {
  export type Payload = Prisma.shopping_mall_administratorsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        name: true,
        is_super_admin: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        administratorGrade:
          ShoppingMallAdministratorGradeAtSummaryTransformer.select(),
        sessions: true,
        passwordResets: true,
        auditLogs: true,
        notificationPreferences: true,
        administrativeAuditLogs: true,
      },
    } satisfies Prisma.shopping_mall_administratorsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallAdministrator> {
    return {
      id: input.id,
      email: input.email,
      name: input.name,
      isSuperAdmin: input.is_super_admin,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      administratorGrade:
        await ShoppingMallAdministratorGradeAtSummaryTransformer.transform(
          input.administratorGrade,
        ),
    };
  }
}
