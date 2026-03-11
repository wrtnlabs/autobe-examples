import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequest";
import { IEcommerceMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRole";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallAdminAtSummaryTransformer } from "./EcommerceMallAdminAtSummaryTransformer";
import { EcommerceMallAdminRoleAtSummaryTransformer } from "./EcommerceMallAdminRoleAtSummaryTransformer";
import { EcommerceMallCustomerAtSummaryTransformer } from "./EcommerceMallCustomerAtSummaryTransformer";

export namespace EcommerceMallAdminRequestTransformer {
  export type Payload = Prisma.ecommerce_mall_admin_requestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        status: true,
        approval_notes: true,
        rejection_reason: true,
        responded_at: true,
        applicant: {
          select: {
            id: true,
            email: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        } satisfies Prisma.ecommerce_mall_customersFindManyArgs,
        superAdmin: {
          select: {
            id: true,
            email: true,
            grade: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        } satisfies Prisma.ecommerce_mall_adminsFindManyArgs,
        adminRole: {
          select: {
            id: true,
            grade: true,
            created_at: true,
            updated_at: true,
          },
        } satisfies Prisma.ecommerce_mall_admin_rolesFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_admin_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallAdminRequest> {
    return {
      id: input.id,
      reason: input.reason,
      status: typia.assert<"pending" | "approved" | "rejected">(input.status),
      applicant: await EcommerceMallCustomerAtSummaryTransformer.transform(
        input.applicant,
      ),
      superAdmin: input.superAdmin
        ? await EcommerceMallAdminAtSummaryTransformer.transform(
            input.superAdmin,
          )
        : null,
      adminRole: input.adminRole
        ? await EcommerceMallAdminRoleAtSummaryTransformer.transform({
            id: input.adminRole.id,
            grade: input.adminRole.grade,
            created_at: input.adminRole.created_at,
            updated_at: input.adminRole.updated_at,
            admin: {},
            adminRequests: [],
          })
        : null,
      approvalNotes: input.approval_notes ?? null,
      rejectionReason: input.rejection_reason ?? null,
      respondedAt: input.responded_at
        ? toISOStringSafe(input.responded_at)
        : null,
    };
  }
}
