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

export namespace ShoppingMallAdminAtSummaryTransformer {
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
        sessions: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_admin_sessionsFindManyArgs,
        passwordResets: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_admin_password_resetsFindManyArgs,
        auditLogs: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_admin_audit_logsFindManyArgs,
        reviewedSellerApprovalRequests: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_seller_approval_requestsFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_adminsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallAdmin.ISummary> {
    return {
      id: input.id,
      email: input.email,
      grade: input.grade,
      status: input.deleted_at
        ? "deleted"
        : input.banned_at
          ? "banned"
          : "active",
      banned_at: input.banned_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      member: await ShoppingMallMemberAtSummaryTransformer.transform(
        input.member,
      ),
    } satisfies IShoppingMallAdmin.ISummary;
  }
}
