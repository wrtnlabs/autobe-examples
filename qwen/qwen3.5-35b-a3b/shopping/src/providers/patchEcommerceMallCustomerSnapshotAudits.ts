import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSnapshotAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSnapshotAudit";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallSnapshotAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSnapshotAudit";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerSnapshotAudits(props: {
  customer: CustomerPayload;
  body: IEcommerceMallSnapshotAudit.IRequest;
}): Promise<IPageIEcommerceMallSnapshotAudit.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const whereConditions: Prisma.ecommerce_mall_snapshot_auditsWhereInput[] = [
    { record_type: "review", changed_by: props.customer.id },
  ];
  if (props.body.from_changed_at) {
    whereConditions.push({
      changed_at: { gte: props.body.from_changed_at },
    });
  }
  if (props.body.to_changed_at) {
    whereConditions.push({
      changed_at: { lt: props.body.to_changed_at },
    });
  }
  if (props.body.changed_by) {
    whereConditions.push({ changed_by: props.body.changed_by });
  }
  if (props.body.record_type && props.body.record_type.length > 0) {
    whereConditions.push({
      record_type: { in: props.body.record_type },
    });
  }
  const whereInput =
    whereConditions.length > 1 ? { AND: whereConditions } : whereConditions[0];
  const orderByInput: Prisma.ecommerce_mall_snapshot_auditsOrderByWithRelationInput =
    props.body.sort === "created_at"
      ? { created_at: "desc" as const }
      : props.body.sort === "record_type"
        ? { record_type: "asc" as const }
        : props.body.sort === "changed_by"
          ? { changed_by: "asc" as const }
          : { changed_at: "desc" as const };
  const data = await MyGlobal.prisma.ecommerce_mall_snapshot_audits.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      record_type: true,
      record_id: true,
      changed_at: true,
      changed_by: true,
    },
  });
  const total = await MyGlobal.prisma.ecommerce_mall_snapshot_audits.count({
    where: whereInput,
  });
  const transformedData = await ArrayUtil.asyncMap(data, async (audit) => {
    const actorQuery =
      await MyGlobal.prisma.ecommerce_mall_customers.findUnique({
        where: { id: audit.changed_by },
        select: {
          id: true,
          email: true,
          is_banned: true,
          created_at: true,
        },
      });
    let actor:
      | IEcommerceMallCustomer.ISummary
      | IEcommerceMallSeller.ISummary
      | IEcommerceMallAdmin.ISummary;
    if (actorQuery) {
      actor = {
        id: actorQuery.id,
        email: actorQuery.email,
        display_name: "",
        is_banned: actorQuery.is_banned,
        created_at: toISOStringSafe(actorQuery.created_at),
      };
    } else {
      const sellerQuery =
        await MyGlobal.prisma.ecommerce_mall_sellers.findUnique({
          where: { id: audit.changed_by },
          select: {
            id: true,
            email: true,
            approval_status: true,
            rejection_reason: true,
            is_suspended: true,
            is_banned: true,
            created_at: true,
            updated_at: true,
          },
        });
      if (sellerQuery) {
        actor = {
          id: sellerQuery.id,
          email: sellerQuery.email,
          approvalStatus: sellerQuery.approval_status as
            | "pending"
            | "approved"
            | "rejected",
          rejectionReason: sellerQuery.rejection_reason,
          isSuspended: sellerQuery.is_suspended,
          isBanned: sellerQuery.is_banned,
          createdAt: toISOStringSafe(sellerQuery.created_at),
          updatedAt: toISOStringSafe(sellerQuery.updated_at),
        };
      } else {
        const adminQuery =
          await MyGlobal.prisma.ecommerce_mall_admins.findUnique({
            where: { id: audit.changed_by },
            select: {
              id: true,
              email: true,
              is_banned: true,
              ban_reason: true,
              created_at: true,
              updated_at: true,
            },
          });
        if (adminQuery) {
          actor = {
            id: adminQuery.id,
            email: adminQuery.email,
            is_banned: adminQuery.is_banned,
            ban_reason: adminQuery.ban_reason,
            created_at: toISOStringSafe(adminQuery.created_at),
            updated_at: toISOStringSafe(adminQuery.updated_at),
          };
        } else {
          actor = {
            id: audit.changed_by,
            email: "",
            display_name: "",
            is_banned: false,
            created_at: toISOStringSafe(new Date()),
          } as IEcommerceMallCustomer.ISummary;
        }
      }
    }
    return {
      id: audit.id,
      record_type: typia.assert<
        | "product"
        | "product_variant"
        | "seller_profile"
        | "order_item"
        | "review"
        | "cancellation_request"
        | "refund_request"
      >(audit.record_type),
      record_id: audit.record_id,
      changed_at: toISOStringSafe(audit.changed_at),
      changed_by: actor,
    } satisfies IEcommerceMallSnapshotAudit.ISummary;
  });
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
