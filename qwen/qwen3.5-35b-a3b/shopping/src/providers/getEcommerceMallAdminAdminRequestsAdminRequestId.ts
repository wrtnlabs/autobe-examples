import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminRequestRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallAdminAtSummaryTransformer } from "../transformers/EcommerceMallAdminAtSummaryTransformer";
import { EcommerceMallAdminRequestRequestTransformer } from "../transformers/EcommerceMallAdminRequestRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminAdminRequestsAdminRequestId(props: {
  admin: AdminPayload;
  adminRequestId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallAdminRequestRequest> {
  const request =
    await MyGlobal.prisma.ecommerce_mall_admin_request_requests.findUniqueOrThrow(
      {
        where: { id: props.adminRequestId },
        select: {
          id: true,
          reason: true,
          request_status: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          ecommerce_mall_admin_id: true,
          admin: EcommerceMallAdminAtSummaryTransformer.select(),
          snapshots: {},
          customerRequests: {},
          sellerRequests: {},
        },
      },
    );
  if (request.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  return await EcommerceMallAdminRequestRequestTransformer.transform(request);
}
