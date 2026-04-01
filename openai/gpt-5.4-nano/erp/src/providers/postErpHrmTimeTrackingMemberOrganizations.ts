import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTrackingOrganizationTransformer } from "../transformers/ErpHrmTimeTrackingOrganizationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmTimeTrackingMemberOrganizations(props: {
  member: MemberPayload;
  body: IErpHrmTimeTrackingOrganization.ICreate;
}): Promise<IErpHrmTimeTrackingOrganization> {
  try {
    const nowIso = toISOStringSafe("2026-03-31T07:18:39.230Z");
    const id = v4();
    const created =
      await MyGlobal.prisma.erp_hrm_time_tracking_organizations.create({
        data: {
          id,
          name: props.body.name,
          description: props.body.description,
          logo_url: props.body.logo_url ?? null,
          currency_code: props.body.currency_code,
          timezone: props.body.timezone,
          fiscal_start_month: props.body.fiscal_start_month,
          created_at: nowIso,
          updated_at: nowIso,
          deleted_at: null,
        },
        ...ErpHrmTimeTrackingOrganizationTransformer.select(),
      });
    return await ErpHrmTimeTrackingOrganizationTransformer.transform(created);
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new HttpException("Organization name already exists", 409);
      }
    }
    throw new HttpException("Internal server error", 500);
  }
}
