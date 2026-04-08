import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallMemberAtSummaryTransformer } from "./ShoppingMallMemberAtSummaryTransformer";

export namespace ShoppingMallAdminTransformer {
  export type Payload = Prisma.shopping_mall_adminsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        grade: true,
        banned_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: ShoppingMallMemberAtSummaryTransformer.select(),
        _count: {
          select: {
            sessions: true,
            passwordResets: true,
            auditLogs: true,
            reviewedSellerApprovalRequests: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_adminsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IShoppingMallAdmin> {
    return {
      id: input.id,
      email: input.email,
      grade: input.grade,
      bannedAt: input.banned_at?.toISOString() ?? null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      member: await ShoppingMallMemberAtSummaryTransformer.transform(
        input.member,
      ),
    } satisfies IShoppingMallAdmin;
  }
}
