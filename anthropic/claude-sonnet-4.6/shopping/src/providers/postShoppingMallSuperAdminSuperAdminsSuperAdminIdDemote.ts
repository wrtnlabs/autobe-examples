import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSuperAdminSuperAdminsSuperAdminIdDemote(props: {
  superAdmin: SuperadminPayload;
  superAdminId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdmin> {
  // 1. Self-demotion guard
  if (props.superAdmin.id === props.superAdminId) {
    throw new HttpException("Self-demotion is not permitted", 400);
  }
  // 2. Look up target super admin with all related data needed for response construction
  const targetSuperAdmin =
    await MyGlobal.prisma.shopping_mall_super_admins.findFirst({
      where: {
        id: props.superAdminId,
        deleted_at: null,
      },
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        ofCustomer: {
          select: {
            id: true,
            customer_id: true,
            created_at: true,
            customer: {
              select: {
                id: true,
                email: true,
                nickname: true,
                phone: true,
                is_banned: true,
                created_at: true,
                updated_at: true,
              },
            },
          },
        },
        ofSeller: {
          select: {
            id: true,
            seller_id: true,
            created_at: true,
            seller: {
              select: {
                id: true,
                email: true,
                shop_name: true,
                is_banned: true,
                is_suspended: true,
                created_at: true,
                updated_at: true,
              },
            },
          },
        },
      },
    });
  if (targetSuperAdmin === null) {
    throw new HttpException("Target super administrator not found", 404);
  }
  // 3. Perform demotion — soft-delete the super admin record to revoke super grade
  await MyGlobal.prisma.shopping_mall_super_admins.update({
    where: { id: props.superAdminId },
    data: { deleted_at: new Date() },
  });
  // 4. Determine actor_type from presence of subtype linkage
  const actor_type: "customer" | "seller" =
    targetSuperAdmin.ofCustomer !== null ? "customer" : "seller";
  // 5. Build origin linkage for the response
  let origin: IShoppingMallAdminOfCustomer | IShoppingMallAdminOfSeller;
  if (actor_type === "customer" && targetSuperAdmin.ofCustomer !== null) {
    const ofCustomer = targetSuperAdmin.ofCustomer;
    origin = {
      id: ofCustomer.id,
      admin_id: targetSuperAdmin.id,
      customer_id: ofCustomer.customer_id,
      customer: {
        id: ofCustomer.customer.id,
        email: ofCustomer.customer.email,
        nickname: ofCustomer.customer.nickname,
        phone: ofCustomer.customer.phone,
        isBanned: ofCustomer.customer.is_banned,
        createdAt: ofCustomer.customer.created_at.toISOString(),
        updatedAt: ofCustomer.customer.updated_at.toISOString(),
      } satisfies IShoppingMallCustomer.ISummary,
      created_at: ofCustomer.created_at.toISOString(),
    } satisfies IShoppingMallAdminOfCustomer;
  } else if (targetSuperAdmin.ofSeller !== null) {
    const ofSeller = targetSuperAdmin.ofSeller;
    origin = {
      id: ofSeller.id,
      admin: {
        id: targetSuperAdmin.id,
        email: targetSuperAdmin.email,
        actor_type: "seller",
        grade: "regular",
        created_at: targetSuperAdmin.created_at.toISOString(),
        updated_at: targetSuperAdmin.updated_at.toISOString(),
        deleted_at: null,
      } satisfies IShoppingMallAdmin.ISummary,
      seller: {
        id: ofSeller.seller.id,
        email: ofSeller.seller.email,
        shopName: ofSeller.seller.shop_name,
        isBanned: ofSeller.seller.is_banned,
        isSuspended: ofSeller.seller.is_suspended,
        createdAt: ofSeller.seller.created_at.toISOString(),
        updatedAt: ofSeller.seller.updated_at.toISOString(),
      } satisfies IShoppingMallSeller.ISummary,
      created_at: ofSeller.created_at.toISOString(),
    } satisfies IShoppingMallAdminOfSeller;
  } else {
    throw new HttpException(
      "Target super administrator has no origin linkage",
      500,
    );
  }
  // 6. Return the demoted admin entity (grade now regular, account still active)
  return {
    id: targetSuperAdmin.id,
    email: targetSuperAdmin.email,
    actor_type,
    grade: "regular",
    origin,
    created_at: targetSuperAdmin.created_at.toISOString(),
    updated_at: targetSuperAdmin.updated_at.toISOString(),
    deleted_at: null,
  } satisfies IShoppingMallAdmin;
}
