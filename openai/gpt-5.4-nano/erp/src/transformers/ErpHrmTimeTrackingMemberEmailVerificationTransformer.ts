import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMemberEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ErpHrmTimeTrackingMemberEmailVerificationTransformer {
  export type Payload =
    Prisma.erp_hrm_time_tracking_member_email_verificationsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        erp_hrm_time_tracking_member_id: true,
        token: true,
        href: true,
        ip: true,
        referrer: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        expired_at: true,
      },
    } satisfies Prisma.erp_hrm_time_tracking_member_email_verificationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeTrackingMemberEmailVerification> {
    return {
      id: input.id,
      erp_hrm_time_tracking_member_id: input.erp_hrm_time_tracking_member_id,
      token: input.token,
      href: input.href,
      ip: input.ip,
      referrer: input.referrer,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      expired_at: input.expired_at.toISOString(),
    };
  }
}
