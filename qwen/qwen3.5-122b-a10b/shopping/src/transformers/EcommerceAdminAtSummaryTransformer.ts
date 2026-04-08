import { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceAdminAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_adminsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        adminSessions: {
          select: {
            id: true,
          },
        },
        passwordResets: {
          select: {
            id: true,
          },
        },
        auditLogs: {
          select: {
            id: true,
          },
        },
        sellerApprovalReviews: {
          select: {
            id: true,
          },
        },
        adminRequestsRevieweds: {
          select: {
            id: true,
          },
        },
        administratorGrade: {
          select: {
            grade: true,
          },
        },
        gradeTransitionsAsTargets: {
          select: {
            id: true,
          },
        },
        gradeTransitionsAsPerformers: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.ecommerce_adminsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceAdmin.ISummary> {
    return {
      id: input.id,
      email: input.email,
      grade: typia.assert<"regular" | "super">(
        input.administratorGrade?.grade ?? "regular",
      ),
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    } satisfies IEcommerceAdmin.ISummary;
  }
}
